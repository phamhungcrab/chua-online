import path from 'node:path';

export interface AudioValidationResult {
  valid: boolean;
  ext: string;
  mimeType: string;
  durationSec: number;
  error?: string;
}

const MPEG_BITRATES_V1_L3 = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0
];

/**
 * Validates audio binary buffer using magic bytes / file signatures,
 * determines MIME type, and computes or estimates duration in seconds.
 */
export function validateAndInspectAudioBuffer(
  buffer: Buffer,
  declaredFileName: string
): AudioValidationResult {
  if (!buffer || buffer.length < 128) {
    return {
      valid: false,
      ext: '',
      mimeType: '',
      durationSec: 0,
      error: 'Tệp âm thanh quá nhỏ hoặc rỗng (yêu cầu tối thiểu 128 bytes).'
    };
  }

  const declaredExt = path.extname(declaredFileName).toLowerCase();

  // 1. WAV Detection (RIFF .... WAVE)
  if (
    buffer.length >= 44 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    let byteRate = 0;
    let dataLength = 0;

    // Search for fmt and data subchunks
    let offset = 12;
    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.subarray(offset, offset + 4).toString('ascii');
      const chunkSize = buffer.readUInt32LE(offset + 4);
      if (chunkId === 'fmt ' && chunkSize >= 16 && offset + 8 + 16 <= buffer.length) {
        byteRate = buffer.readUInt32LE(offset + 8 + 8); // Offset 28 in standard WAV
      } else if (chunkId === 'data') {
        dataLength = chunkSize;
        break;
      }
      offset += 8 + chunkSize;
    }

    const durationSec =
      byteRate > 0 && dataLength > 0
        ? Math.max(1, Math.round(dataLength / byteRate))
        : Math.max(1, Math.round((buffer.length - 44) / (44100 * 2 * 2)));

    return {
      valid: true,
      ext: '.wav',
      mimeType: 'audio/wav',
      durationSec
    };
  }

  // 2. MP3 Detection (ID3v2 header OR MPEG Frame Sync)
  const isId3 =
    buffer.length >= 10 && buffer.subarray(0, 3).toString('ascii') === 'ID3';
  const hasMpegSync = checkMpegFrameSync(buffer);

  if (isId3 || hasMpegSync) {
    let durationSec = 0;

    // Try parsing ID3v2 TLEN frame if present
    if (isId3) {
      const tlenMs = parseId3Tlen(buffer);
      if (tlenMs && tlenMs > 0) {
        durationSec = Math.max(1, Math.round(tlenMs / 1000));
      }
    }

    // If TLEN not available, calculate from MPEG frame bitrate
    if (durationSec === 0) {
      const bitrateKbps = detectMpegBitrate(buffer);
      const effectiveKbps = bitrateKbps > 0 ? bitrateKbps : 128;
      durationSec = Math.max(1, Math.round((buffer.length * 8) / (effectiveKbps * 1000)));
    }

    return {
      valid: true,
      ext: '.mp3',
      mimeType: 'audio/mpeg',
      durationSec
    };
  }

  // 3. OGG Detection (OggS)
  if (
    buffer.length >= 14 &&
    buffer.subarray(0, 4).toString('ascii') === 'OggS'
  ) {
    // Standard Vorbis/Opus audio estimate (~128 kbps)
    const durationSec = Math.max(1, Math.round((buffer.length * 8) / (128 * 1000)));
    return {
      valid: true,
      ext: '.ogg',
      mimeType: 'audio/ogg',
      durationSec
    };
  }

  // 4. M4A / MP4 / AAC Detection
  const isFtypM4a =
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  const isAdtsAac =
    buffer.length >= 4 &&
    buffer[0] === 0xff &&
    (buffer[1] & 0xf6) === 0xf0;

  if (isFtypM4a || isAdtsAac) {
    const durationSec = Math.max(1, Math.round((buffer.length * 8) / (128 * 1000)));
    return {
      valid: true,
      ext: declaredExt === '.aac' ? '.aac' : '.m4a',
      mimeType: declaredExt === '.aac' ? 'audio/aac' : 'audio/mp4',
      durationSec
    };
  }

  // 5. FLAC Detection (fLaC)
  if (
    buffer.length >= 4 &&
    buffer.subarray(0, 4).toString('ascii') === 'fLaC'
  ) {
    // Estimate based on lossless compression ~700 kbps
    const durationSec = Math.max(1, Math.round((buffer.length * 8) / (700 * 1000)));
    return {
      valid: true,
      ext: '.flac',
      mimeType: 'audio/flac',
      durationSec
    };
  }

  return {
    valid: false,
    ext: '',
    mimeType: '',
    durationSec: 0,
    error: `Tệp không đúng định dạng âm thanh chuẩn (không tìm thấy chữ ký MP3, WAV, OGG, M4A hoặc FLAC).`
  };
}

function checkMpegFrameSync(buffer: Buffer): boolean {
  const scanLimit = Math.min(buffer.length - 2, 4096);
  for (let i = 0; i < scanLimit; i++) {
    if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
      const layerBits = (buffer[i + 1] >> 1) & 0x03;
      if (layerBits !== 0) {
        return true;
      }
    }
  }
  return false;
}

function detectMpegBitrate(buffer: Buffer): number {
  const scanLimit = Math.min(buffer.length - 4, 8192);
  for (let i = 0; i < scanLimit; i++) {
    if (buffer[i] === 0xff && (buffer[i + 1] & 0xe0) === 0xe0) {
      const bitrateIndex = (buffer[i + 2] >> 4) & 0x0f;
      const bitrate = MPEG_BITRATES_V1_L3[bitrateIndex] || 0;
      if (bitrate > 0) {
        return bitrate;
      }
    }
  }
  return 128; // fallback standard 128 kbps
}

function parseId3Tlen(buffer: Buffer): number | null {
  try {
    const tagSize =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
      (buffer[9] & 0x7f);

    const maxOffset = Math.min(buffer.length, 10 + tagSize);
    let offset = 10;

    while (offset + 10 < maxOffset) {
      const frameId = buffer.subarray(offset, offset + 4).toString('ascii');
      const frameSize = buffer.readUInt32BE(offset + 4);

      if (frameId === 'TLEN' && frameSize > 1 && offset + 10 + frameSize <= maxOffset) {
        // String encoding byte at offset + 10, then text
        const text = buffer
          .subarray(offset + 11, offset + 10 + frameSize)
          .toString('utf8')
          .replace(/\0/g, '')
          .trim();
        const ms = parseInt(text, 10);
        if (!isNaN(ms) && ms > 0) return ms;
      }

      if (frameSize <= 0 || !/^[A-Z0-9]{4}$/.test(frameId)) {
        break;
      }
      offset += 10 + frameSize;
    }
  } catch {
    // ignore parsing failure
  }
  return null;
}
