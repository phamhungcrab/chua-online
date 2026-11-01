import type {
  CharacterSkinId,
  EventActionRule,
  FortuneStick,
  TempleSettings
} from './types.ts';

export const DEFAULT_SETTINGS: TempleSettings = {
  title: 'Chánh Điện Tịnh Tâm',
  subtitle: 'Nam Mô A Di Đà Phật · Tâm An Vạn Sự An',
  ethicsNotice:
    'Không gian văn hóa & tĩnh tâm trực tuyến. Điểm Công Đức trong ứng dụng là điểm tương tác ảo, không phải quyên góp tài chính và không gắn với cam kết lợi ích.',
  seatCapacityMode: 'auto',
  joinOnMemberEnter: false,
  qualityPreset: 'high',
  targetFps: 60,
  timeOfDay: 'SACRED_NIGHT',
  weather: 'CLEAR',
  smokeDensity: 1.0,
  petalDensity: 1.0,
  lightingWarmth: 1.0,
  autoChantEnabled: true,
  autoChantIntervalMin: 4,
  woodenFishRhythmEnabled: true,
  woodenFishBpm: 52,
  ttsEnabled: true,
  ttsVoice: 'vi-VN-HoaiMyNeural',
  ttsRatePercent: -12,
  ttsPitchHz: -6,
  ttsMinGiftDiamonds: 1,
  ttsReadPrayers: true,
  ttsReadFortunes: true,
  fortuneEnabled: true,
  flowerOfferingEnabled: true,
  lunarFestivalAuto: true,
  showSafeZones: false,
  collectivePrayersEnabled: true,
  idleSereneChimes: true,
  audioMasterVolume: 0.9,
  audioMusicVolume: 0.55,
  audioSfxVolume: 0.85,
  audioTtsVolume: 0.95,
  moderationEnabled: true,
  userCooldownMs: 3200
};

export const SKIN_KEYWORD_MAP: ReadonlyArray<{ skin: CharacterSkinId; keywords: readonly string[] }> = [
  { skin: 'master_vip', keywords: ['hộ pháp', 'ho phap', 'cao tăng', 'cao tang', 'ưB', 'vip'] },
  { skin: 'monk', keywords: ['sư', 'su', 'sư thầy', 'su thay', 'thầy', 'thay', 'tăng', 'tang'] },
  { skin: 'nun', keywords: ['ni', 'ni cô', 'ni co', 'sư cô', 'su co'] },
  { skin: 'child', keywords: ['tiểu', 'tieu', 'chú tiểu', 'chu tieu', 'bé', 'be'] },
  { skin: 'brown_elder', keywords: ['bà', 'ba', 'cụ', 'cu', 'áo nâu', 'ao nau'] },
  { skin: 'lam_female', keywords: ['nữ', 'nu', 'chị', 'chi', 'gái', 'gai', 'áo lam nữ'] },
  { skin: 'lam_male', keywords: ['nam', 'anh', 'trai', 'áo lam nam'] }
];

export const DEFAULT_SKIN_CYCLE: readonly CharacterSkinId[] = [
  'lam_female',
  'lam_male',
  'lam_female',
  'brown_elder',
  'lam_male',
  'child',
  'monk',
  'nun'
];

export const BUDDHIST_CHANTS: readonly string[] = [
  'Nam mô Bổn Sư Thích Ca Mâu Ni Phật. Nguyện đem công đức lành, hướng về khắp tất cả, thân tâm luôn an lạc.',
  'Nam mô A Di Đà Phật. Tâm bình thế giới bình, tâm an vạn sự an.',
  'Nam mô Đại Bi Quán Thế Âm Bồ Tát. Nguyện cầu cho gia đạo bình an, cha mẹ mạnh khỏe, bốn mùa cát tường.',
  'Tiếng chuông chùa ngân vang xóa tan muộn phiền, chúc đại chúng một buổi tối thanh tịnh và an nhiên.'
];

export const DEFAULT_WISHES: readonly string[] = [
  'Nguyện cầu gia đạo bình an, cha mẹ mạnh khỏe sống lâu',
  'Nguyện cầu thân tâm an lạc, muộn phiền tiêu tan',
  'Nguyện cầu công việc hanh thông, vạn sự cát tường như ý',
  'Nguyện cầu quốc thái dân an, mưa thuận gió hòa',
  'Thành tâm kính lễ Tam Bảo, chúc mọi người bình an hạnh phúc'
];

export const FORTUNE_STICKS_DECK: readonly FortuneStick[] = [
  {
    number: 1,
    rank: 'Thượng Thượng Cát',
    title: 'Nhật Xuất Đông Phương — Mặt Trời Mọc Phương Đông',
    poem: 'Đông phương nhật xuất chiếu Càn Khôn\nHoa nở đầy cành rạng sắc xuân\nCông danh sự nghiệp thêm rộng mở\nGia đạo bình an phúc lộc tồn.',
    meaning: 'Hình ảnh ánh bình minh xua tan sương sớm. Khuyến khích giữ tâm sáng và kiên trì với mục tiêu lành.',
    ttsSummary: 'Quẻ số 1, Thượng Thượng Cát, Nhật Xuất Đông Phương. Chúc thí chủ tâm sáng chí bền, gia đạo bình an.'
  },
  {
    number: 6,
    rank: 'Thượng Cát',
    title: 'Xuân Phong Đắc Ý — Gió Xuân Thuận Buồm',
    poem: 'Thuận buồm xuôi gió vượt trùng khơi\nBến giác bình yên nắng rạng ngời\nHòa khí sinh tài nhân duyên tốt\nBốn mùa êm ấm rộn niềm vui.',
    meaning: 'Lấy sự hòa nhã và chân thành làm gốc sẽ gặp nhiều thiện duyên trong công việc và cuộc sống.',
    ttsSummary: 'Quẻ số 6, Thượng Cát, Xuân Phong Đắc Ý. Hòa khí sinh tài, bốn mùa êm ấm.'
  },
  {
    number: 8,
    rank: 'Thượng Cát',
    title: 'Kim Liên Khai Nở — Sen Vàng Tỏa Ngát',
    poem: 'Sen vàng nở rộ giữa hồ trong\nHương thơm lan tỏa khắp non sông\nGiữ lòng thanh tịnh làm việc thiện\nPhước lành tự đến thỏa ước mong.',
    meaning: 'Biểu tượng hoa sen vươn lên từ bùn. Sống thiện lương và bình tĩnh sẽ gặt hái quả ngọt.',
    ttsSummary: 'Quẻ số 8, Thượng Cát, Kim Liên Khai Nở. Giữ lòng thanh tịnh, vạn sự hanh thông.'
  },
  {
    number: 12,
    rank: 'Đại Cát',
    title: 'Long Vân Tương Hội — Rồng Mây Gặp Gỡ',
    poem: 'Rồng thiêng gặp hội tầng mây xanh\nChăm chỉ chuyên cần rạng rỡ danh\nKiên tâm rèn luyện bền ý chí\nHoa thơm trái ngọt khắp gia đình.',
    meaning: 'Những nỗ lực học tập và rèn luyện bền bỉ đang bước vào giai đoạn thuận lợi.',
    ttsSummary: 'Quẻ số 12, Đại Cát, Long Vân Tương Hội. Chăm chỉ chuyên cần, học hành sự nghiệp tiến tới.'
  },
  {
    number: 18,
    rank: 'Thượng Cát',
    title: 'Minh Nguyệt Đương Không — Trăng Sáng Giữa Trời',
    poem: 'Trăng tròn vằng vặc giữa trời thu\nSoi sáng muôn phương sạch mây mù\nGia đình hòa thuận thêm gắn kết\nTâm an vạn sự chẳng ưu tư.',
    meaning: 'Nhắc nhở trân trọng tình cảm gia đình và giữ tâm hồn trong sáng, thư thái.',
    ttsSummary: 'Quẻ số 18, Thượng Cát, Minh Nguyệt Đương Không. Gia đình hòa thuận, tâm an vạn sự lành.'
  },
  {
    number: 24,
    rank: 'Trung Cát',
    title: 'Vũ Quá Thiên Thanh — Mưa Tạnh Trời Trong',
    poem: 'Mưa qua trời lại sáng trong ngần\nThử thách lùi xa đón phúc phần\nGiữ vững lòng thành đừng nóng vội\nBình tâm bước tiếp vững đôi chân.',
    meaning: 'Sau cơn mưa trời lại sáng. Khuyên giữ sự điềm tĩnh và kiên nhẫn trước mọi việc.',
    ttsSummary: 'Quẻ số 24, Trung Cát, Vũ Quá Thiên Thanh. Sau cơn mưa trời lại sáng, hãy giữ tâm điềm tĩnh.'
  },
  {
    number: 32,
    rank: 'Thượng Cát',
    title: 'Tùng Bách Trường Thanh — Tùng Bách Vững Bền',
    poem: 'Tùng xanh đứng vững giữa sương mai\nGốc rễ bền sâu chẳng nhạt phai\nSức khỏe dồi dào tâm an định\nPhúc dày con cháu hướng tương lai.',
    meaning: 'Biểu tượng của sức khỏe, sự bền bỉ và nền tảng gia đình vững chắc.',
    ttsSummary: 'Quẻ số 32, Thượng Cát, Tùng Bách Trường Thanh. Chúc thí chủ sức khỏe dồi dào, tâm trí vững vàng.'
  },
  {
    number: 36,
    rank: 'Thượng Thượng Cát',
    title: 'Phúc Tinh Cao Chiếu — Sao Phúc Chiếu Sáng',
    poem: 'Phúc tinh rực sáng giữa đêm rằm\nHiếu thảo vẹn toàn suốt quanh năm\nTri ân cha mẹ bồi gốc phúc\nTrăm điều thiện mỹ vạn điều lành.',
    meaning: 'Đề cao lòng hiếu thảo và sự biết ơn — cội nguồn của bình an và hạnh phúc.',
    ttsSummary: 'Quẻ số 36, Thượng Thượng Cát, Phúc Tinh Cao Chiếu. Lòng hiếu thảo mang lại trăm điều lành.'
  },
  {
    number: 45,
    rank: 'Trung Cát',
    title: 'Khê Thủy Lưu Trường — Suối Nguồn Chảy Mãi',
    poem: 'Dòng suối trong lành chảy bốn phương\nTích tiểu thành đại vững con đường\nChắt chiu từng bước không xao nhãng\nBiển rộng sông dài thỏa chí vương.',
    meaning: 'Khuyên tích lũy kiến thức và kinh nghiệm từng chút mỗi ngày như dòng suối nhỏ.',
    ttsSummary: 'Quẻ số 45, Trung Cát, Khê Thủy Lưu Trường. Tích tiểu thành đại, kiên trì ắt thành công.'
  },
  {
    number: 52,
    rank: 'Thượng Cát',
    title: 'Ngọc Xuất Côn Sơn — Ngọc Quý Tỏa Sáng',
    poem: 'Ngọc quý Côn Sơn tỏa ánh ngời\nBấy lâu rèn giũa nay gặp thời\nTri âm tương ngộ cùng nâng đỡ\nSự nghiệp vươn cao rạng rỡ đời.',
    meaning: 'Ngọc càng mài càng sáng. Khuyến khích trau dồi năng lực và hợp tác chân thành với đồng nghiệp.',
    ttsSummary: 'Quẻ số 52, Thượng Cát, Ngọc Xuất Côn Sơn. Ngọc mài thêm sáng, gặp bạn hiền nâng đỡ.'
  },
  {
    number: 60,
    rank: 'Đại Cát',
    title: 'Bách Hoa Tề Phóng — Trăm Hoa Đua Nở',
    poem: 'Trăm hoa đua nở đón xuân sang\nNắng ấm chan hòa khắp xóm làng\nSáng tạo đổi mới nhiều ý đẹp\nTương lai tươi sáng bước thênh thang.',
    meaning: 'Khuyến khích tinh thần cởi mở, sáng tạo và học hỏi điều mới.',
    ttsSummary: 'Quẻ số 60, Đại Cát, Bách Hoa Tề Phóng. Tinh thần sáng tạo, tương lai rộng mở.'
  },
  {
    number: 68,
    rank: 'Đại Cát',
    title: 'Lộc Mã Đồng Hương — Thuận Lợi Song Hành',
    poem: 'Lộc Mã song hành đến tận nhà\nLàm ăn chân chính nở như hoa\nChữ tín giữ trọn cùng năm tháng\nPhú quý bình an khắp một nhà.',
    meaning: 'Giữ trọn chữ tín và sự minh bạch trong công việc sẽ mang lại thành quả bền vững.',
    ttsSummary: 'Quẻ số 68, Đại Cát, Lộc Mã Đồng Hương. Giữ trọn chữ tín, công việc thuận lợi.'
  },
  {
    number: 72,
    rank: 'Thượng Cát',
    title: 'Thanh Phong Minh Nguyệt — Gió Mát Trăng Thanh',
    poem: 'Gió mát trăng thanh cảnh thái bình\nBuông bỏ hơn thua giữ tâm minh\nThảnh thơi ngắm nhìn mây cuối núi\nAn nhiên tự tại trọn ân tình.',
    meaning: 'Nhắc nhở biết buông bỏ căng thẳng, giữ sự cân bằng giữa công việc và nghỉ ngơi.',
    ttsSummary: 'Quẻ số 72, Thượng Cát, Thanh Phong Minh Nguyệt. Tâm hồn thư thái, an nhiên tự tại.'
  },
  {
    number: 79,
    rank: 'Trung Cát',
    title: 'Đại Địa Hồi Xuân — Đất Trời Đón Xuân',
    poem: 'Đông tàn xuân đến lộc đâm chồi\nCây cối vươn mình khắp núi đồi\nKhởi đầu kế hoạch bằng tâm sáng\nNắng ấm chan hòa rạng niềm vui.',
    meaning: 'Thời điểm tốt để bắt đầu thói quen lành mạnh và kế hoạch mới một cách chu đáo.',
    ttsSummary: 'Quẻ số 79, Trung Cát, Đại Địa Hồi Xuân. Khởi đầu mới tràn đầy sức sống.'
  },
  {
    number: 81,
    rank: 'Thượng Cát',
    title: 'Nguyệt Nhập Trung Thiên — Trăng Rằm Giữa Đỉnh',
    poem: 'Trăng rằm tỏa sáng khắp không gian\nNhân nghĩa vẹn toàn phúc chứa chan\nYêu thương chia sẻ cùng bằng hữu\nCuộc sống an vui bước nhẹ nhàng.',
    meaning: 'Sự sẻ chia và lòng nhân ái giúp gắn kết mọi người xung quanh.',
    ttsSummary: 'Quẻ số 81, Thượng Cát, Nguyệt Nhập Trung Thiên. Sống nhân ái sẻ chia, cuộc sống an vui.'
  },
  {
    number: 88,
    rank: 'Đại Cát',
    title: 'Song Hỷ Lâm Môn — Niềm Vui Gõ Cửa',
    poem: 'Chim én báo tin giữa nắng hồng\nNiềm vui nhân đôi thỏa ước mong\nGia đình đầm ấm thêm tiếng cười\nTrên dưới đồng lòng vạn sự thông.',
    meaning: 'Sự đồng lòng và thấu hiểu trong gia đình mang lại niềm vui trọn vẹn.',
    ttsSummary: 'Quẻ số 88, Đại Cát, Song Hỷ Lâm Môn. Gia đình đồng lòng, niềm vui nhân đôi.'
  },
  {
    number: 95,
    rank: 'Thượng Cát',
    title: 'Hải Khut Thiên Không — Biển Rộng Trời Cao',
    poem: 'Biển rộng cá bơi thỏa sức vươn\nTrời cao chim sải cánh muôn phương\nBao dung độ lượng tâm rộng mở\nHạnh phúc bình an khắp nẻo đường.',
    meaning: 'Lòng bao dung và tầm nhìn rộng mở giúp vượt qua mọi chuyện nhỏ nhặt.',
    ttsSummary: 'Quẻ số 95, Thượng Cát, Hải Khoát Thiên Không. Tâm lượng bao dung, bình an tự tại.'
  },
  {
    number: 99,
    rank: 'Thượng Thượng Cát',
    title: 'Vạn Sự Viên Thành — Cửu Cửu Cát Tường',
    poem: 'Chín tầng mây trắng ánh hào quang\nTâm thiện dẫn đường bước vững vàng\nHiếu nghĩa vẹn tròn thêm trí tuệ\nTrọn đời an lạc hưởng vinh khang.',
    meaning: 'Quẻ biểu trưng cho sự viên mãn khi kết hợp cả trí tuệ, lòng nhân ái và sự kiên trì.',
    ttsSummary: 'Quẻ số 99, Thượng Thượng Cát, Vạn Sự Viên Thành. Tâm thiện trí sáng, vạn sự cát tường.'
  }
];

export const DEFAULT_EVENT_RULES: readonly EventActionRule[] = [
  {
    id: 'rule_fortune_chat',
    name: 'Xin Xăm / Gieo Quẻ Đầu Xuân',
    enabled: true,
    priority: 85,
    cooldownSec: 8,
    matchMode: 'any',
    conditions: [
      { field: 'event.comment', op: 'contains', value: 'xin xăm' },
      { field: 'event.comment', op: 'contains', value: 'xin xam' },
      { field: 'event.comment', op: 'contains', value: 'gieo quẻ' },
      { field: 'event.comment', op: 'contains', value: 'gieo que' },
      { field: 'event.comment', op: 'contains', value: 'rút quẻ' }
    ],
    actionType: 'DRAW_FORTUNE',
    actionParams: {
      meritBase: 10,
      readTts: true,
      ttsTemplate: 'Phật tử {{user.nickname}} xin quẻ văn hóa đầu xuân. {{fortune.ttsSummary}}'
    }
  },
  {
    id: 'rule_lantern_prayer',
    name: 'Thả Đèn Hoa Đăng Cầu Nguyện',
    enabled: true,
    priority: 75,
    cooldownSec: 3,
    matchMode: 'any',
    conditions: [
      { field: 'event.comment', op: 'contains', value: 'cầu' },
      { field: 'event.comment', op: 'contains', value: 'nguyện' },
      { field: 'event.comment', op: 'contains', value: 'bình an' },
      { field: 'event.comment', op: 'contains', value: 'mạnh khỏe' },
      { field: 'event.comment', op: 'contains', value: 'hoa đăng' }
    ],
    actionType: 'RELEASE_LANTERN',
    actionParams: {
      incenseCount: 1,
      meritBase: 10,
      readTts: true,
      ttsTemplate: 'Đèn hoa đăng của Phật tử {{user.nickname}}: {{wish}}.'
    }
  },
  {
    id: 'rule_offer_flowers',
    name: 'Dâng Hoa Sen Tươi Cúng Phật',
    enabled: true,
    priority: 74,
    cooldownSec: 3,
    matchMode: 'any',
    conditions: [
      { field: 'event.comment', op: 'contains', value: 'dâng hoa' },
      { field: 'event.comment', op: 'contains', value: 'cúng hoa' },
      { field: 'event.comment', op: 'contains', value: 'hoa sen' }
    ],
    actionType: 'OFFER_FLOWERS',
    actionParams: {
      offeringKind: 'lotus',
      meritBase: 15,
      readTts: true,
      ttsTemplate: 'Phật tử {{user.nickname}} thành tâm dâng hoa sen tươi cúng dường Tam Bảo. {{wish}}.'
    }
  },
  {
    id: 'rule_incense_chat',
    name: 'Thắp Hương & Kính Lễ Tam Bảo',
    enabled: true,
    priority: 70,
    cooldownSec: 2,
    matchMode: 'any',
    conditions: [
      { field: 'event.comment', op: 'contains', value: 'thắp hương' },
      { field: 'event.comment', op: 'contains', value: 'dâng hương' },
      { field: 'event.comment', op: 'contains', value: 'nam mô' },
      { field: 'event.comment', op: 'contains', value: 'a di đà' },
      { field: 'event.comment', op: 'contains', value: 'lạy phật' }
    ],
    actionType: 'BURN_INCENSE',
    actionParams: {
      incenseCount: 3,
      meritBase: 9,
      readTts: true,
      ttsTemplate: 'Nam mô A Di Đà Phật. Phật tử {{user.nickname}} thành tâm dâng hương: {{wish}}.'
    }
  },
  {
    id: 'rule_bell_chat',
    name: 'Thỉnh Đại Hồng Chung Bằng Bình Luận',
    enabled: true,
    priority: 72,
    cooldownSec: 4,
    matchMode: 'any',
    conditions: [
      { field: 'event.comment', op: 'contains', value: 'thỉnh chuông' },
      { field: 'event.comment', op: 'contains', value: 'tiếng chuông' }
    ],
    actionType: 'RING_BELL',
    actionParams: {
      meritBase: 10,
      readTts: false
    }
  },
  {
    id: 'rule_follow_share_bell',
    name: 'Follow & Share — Thỉnh Chuông Chào Mừng',
    enabled: true,
    priority: 65,
    cooldownSec: 2,
    matchMode: 'any',
    conditions: [
      { field: 'event.type', op: 'equals', value: 'follow' },
      { field: 'event.type', op: 'equals', value: 'share' }
    ],
    actionType: 'RING_BELL',
    actionParams: {
      meritBase: 12,
      readTts: false,
      ttsTemplate: 'Chào mừng Phật tử {{user.nickname}} hữu duyên ghé thăm Chánh Điện.'
    }
  },
  {
    id: 'rule_grand_gift',
    name: 'Đại Lễ Hào Quang Kim Liên (Gift >= 100 xu)',
    enabled: true,
    priority: 100,
    cooldownSec: 0,
    matchMode: 'all',
    conditions: [
      { field: 'event.type', op: 'equals', value: 'gift' },
      { field: 'event.gift.totalDiamonds', op: 'greater_or_equal', value: 100 }
    ],
    actionType: 'GRAND_CEREMONY',
    actionParams: {
      offeringKind: 'dragon',
      incenseCount: 9,
      meritBase: 200,
      readTts: true,
      ttsTemplate: 'Nam mô A Di Đà Phật! Cảm tạ Phật tử {{user.nickname}} dâng đại lễ {{gift.name}}. {{wish}}.'
    }
  },
  {
    id: 'rule_standard_gift',
    name: 'Dâng Lễ Vật Hoa Sen & Đèn Lưu Ly (Gift < 100 xu)',
    enabled: true,
    priority: 95,
    cooldownSec: 0,
    matchMode: 'all',
    conditions: [
      { field: 'event.type', op: 'equals', value: 'gift' },
      { field: 'event.gift.totalDiamonds', op: 'less_or_equal', value: 99 }
    ],
    actionType: 'OFFER_GIFT',
    actionParams: {
      offeringKind: 'lotus',
      incenseCount: 3,
      meritBase: 30,
      readTts: true,
      ttsTemplate: 'Cảm tạ Phật tử {{user.nickname}} thành tâm dâng {{gift.name}}. {{wish}}.'
    }
  }
];
