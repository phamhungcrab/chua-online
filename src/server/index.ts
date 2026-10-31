import { createStudioServer } from './httpServer.ts';

async function main(): Promise<void> {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';

  const studio = await createStudioServer({ port, host });

  console.log('======================================================================');
  console.log('🪷 TEMPLE LIVE STUDIO — CHÁNH ĐIỆN VIỆT NAM 2.5D ĐÃ KHỞI ĐỘNG');
  console.log(`📺 OBS / Mobile 9:16 Overlay : http://${studio.host}:${studio.port}/overlay`);
  console.log(`🪟 OBS Transparent Mode      : http://${studio.host}:${studio.port}/overlay?obs=1&transparent=1`);
  console.log(`🎛️  Admin Studio Dashboard    : http://${studio.host}:${studio.port}/admin`);
  console.log(`🩺 Health Check Endpoint     : http://${studio.host}:${studio.port}/api/health`);
  console.log('======================================================================');

  const shutdown = async (signal: string) => {
    console.log(`\n[Temple Live Studio] Nhận tín hiệu ${signal}, đang lưu trạng thái và đóng kết nối...`);
    await studio.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[Temple Live Studio] Lỗi khởi động:', err);
  process.exit(1);
});
