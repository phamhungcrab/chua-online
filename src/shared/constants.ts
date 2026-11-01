import type {
  CharacterSkinId,
  EventActionRule,
  FortuneStick,
  RitualAnchorsConfig,
  SceneConfig,
  SceneLayerConfig,
  ScenePresetItem,
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
  fortuneReadMode: 'summary',
  fortuneUserCooldownSec: 15,
  fortuneVoice: 'vi-VN-HoaiMyNeural',
  fortuneRatePercent: -10,
  fortuneVolume: 0.95,
  flowerOfferingEnabled: true,
  lunarFestivalAuto: true,
  showSafeZones: false,
  collectivePrayersEnabled: true,
  idleSereneChimes: true,
  audioMasterVolume: 0.9,
  audioMusicVolume: 0.55,
  audioSfxVolume: 0.85,
  audioTtsVolume: 0.95,
  audioBellVolume: 0.9,
  audioWoodenFishVolume: 0.85,
  audioCeremonyVolume: 0.95,
  audioDuckingPercent: 70,
  audioDuckingEnabled: true,
  ttsModerationStrict: true,
  ttsReadFreeComments: false,
  activeBgmTrackId: null,
  activePlaylistId: null,
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
    number: 3,
    rank: 'Thượng Cát',
    title: 'Đăng Sơn Kiến Nhật — Leo Núi Thấy Mặt Trời',
    poem: 'Leo dốc đường xa chớ ngại ngần\nĐỉnh cao mây trắng rạng bình minh\nKiên tâm bền chí qua gian khó\nÁnh sáng ngời soi vạn nẻo tình.',
    meaning: 'Bền chí vượt khó khăn ban đầu sẽ thấy kết quả rạng rỡ và cơ hội mới mở ra.',
    ttsSummary: 'Quẻ số 3, Thượng Cát, Đăng Sơn Kiến Nhật. Kiên tâm bền chí, vượt khó thành công.'
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
    number: 10,
    rank: 'Đại Cát',
    title: 'Chi Lan Ngọc Thụ — Cây Ngọc Cành Vàng',
    poem: 'Cây lành đượm mát bóng bờ ao\nCon cháu ngoan hiền dạ ước ao\nGia phong gìn giữ nền đạo đức\nPhước đức dài lâu sáng rực màu.',
    meaning: 'Nền tảng đạo đức gia đình là gốc rễ của mọi sự phát đạt và bình yên.',
    ttsSummary: 'Quẻ số 10, Đại Cát, Chi Lan Ngọc Thụ. Gia phong gìn giữ, phúc đức dài lâu.'
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
    number: 15,
    rank: 'Trung Cát',
    title: 'Thủy Tĩnh Liên Hương — Nước Lặng Sen Thơm',
    poem: 'Mặt hồ phẳng lặng gợn làn lăn\nHương sen thanh khiết đượm tình thân\nĐừng vội tranh đua điều hư ảo\nBình tâm giữ lấy phúc muôn phần.',
    meaning: 'Khuyên giữ tâm điềm tĩnh, không nên vội vã chạy theo hư danh.',
    ttsSummary: 'Quẻ số 15, Trung Cát, Thủy Tĩnh Liên Hương. Giữ tâm phẳng lặng, hương thơm tự tỏa.'
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
    number: 20,
    rank: 'Thượng Cát',
    title: 'Đắc Ý Xuân Phong — Ngựa Tốt Đường Dài',
    poem: 'Đường xa ngựa tốt vó băng băng\nGặp bạn đồng tâm chí tỏ tường\nTương trợ lẫn nhau xây sự nghiệp\nNắng vàng rực rỡ khắp muôn phương.',
    meaning: 'Gặp được bạn hữu đồng hành cùng chí hướng tốt đẹp.',
    ttsSummary: 'Quẻ số 20, Thượng Cát, Đắc Ý Xuân Phong. Gặp bạn đồng hành, sự nghiệp tiến bước.'
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
    number: 28,
    rank: 'Trung Cát',
    title: 'Hàm Thiềm Ẩn Nguyệt — Trăng Núp Sau Mây',
    poem: 'Mây mờ thoáng phủ vầng trăng trong\nTạm lắng tâm tư giữa cõi lòng\nChờ đợi thời cơ nuôi dưỡng sức\nTrời quang mây tạnh thỏa niềm mong.',
    meaning: 'Giai đoạn cần kiên nhẫn tích lũy nội lực, tránh vội vã quyết định.',
    ttsSummary: 'Quẻ số 28, Trung Cát, Hàm Thiềm Ẩn Nguyệt. Kiên nhẫn tích lũy, đợi lúc trời quang.'
  },
  {
    number: 30,
    rank: 'Đại Cát',
    title: 'Tích Thiện Phùng Duyên — Gieo Lành Gặp Duyên',
    poem: 'Gieo hạt mầm lành giữa sớm mai\nCây xanh trĩu quả tháng năm dài\nNgười gieo tâm thiện phước vô lượng\nẤm no hạnh phúc sáng tương lai.',
    meaning: 'Sống có ích, biết giúp đỡ người khác sẽ tích tụ nhiều phúc báo.',
    ttsSummary: 'Quẻ số 30, Đại Cát, Tích Thiện Phùng Duyên. Gieo hạt mầm lành, phước đức vô lượng.'
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
    number: 40,
    rank: 'Thượng Cát',
    title: 'Cao Sơn Lưu Thủy — Núi Cao Sông Dài',
    poem: 'Đàn xưa tấu khúc nhạc tri âm\nTri kỷ tương phùng tỏ dạ thâm\nChia sẻ niềm vui cùng nỗi nhớ\nTình thâm nghĩa nặng ấm quanh năm.',
    meaning: 'Trân quý tình bạn chân thành và những người cùng chí hướng.',
    ttsSummary: 'Quẻ số 40, Thượng Cát, Cao Sơn Lưu Thủy. Trân quý bạn hiền, tình thâm nghĩa nặng.'
  },
  {
    number: 42,
    rank: 'Trung Cát',
    title: 'Chuyên Cần Đắc Quả — Cần Cù Gặt Hái',
    poem: 'Ruộng sâu chăm bón lúc cày bừa\nChẳng quản mồ hôi nắng sớm trưa\nMùa màng trĩu hạt bông vàng óng\nNo ấm yên vui thỏa ước mơ.',
    meaning: 'Cần cù bù thông minh, chăm chỉ làm việc ắt có quả ngọt.',
    ttsSummary: 'Quẻ số 42, Trung Cát, Chuyên Cần Đắc Quả. Chăm chỉ cần cù, ắt gặt quả ngọt.'
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
    number: 48,
    rank: 'Đại Cát',
    title: 'Quang Minh Chính Đại — Lối Thẳng Đường Ngay',
    poem: 'Đi đường ngay thẳng bước an nhiên\nChẳng sợ phong ba chẳng lụy phiền\nTâm sáng lòng trong trời đất chứng\nDanh thơm để lại phúc đời truyền.',
    meaning: 'Giữ sự trung thực và minh bạch, lòng không có gì phải e ngại.',
    ttsSummary: 'Quẻ số 48, Đại Cát, Quang Minh Chính Đại. Lòng ngay dạ thẳng, an nhiên tự tại.'
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
    number: 56,
    rank: 'Thượng Cát',
    title: 'Đăng Cao Vọng Viễn — Nhìn Xa Trông Rộng',
    poem: 'Lên đài ngắm cảnh bóng mây trôi\nTầm mắt thênh thang trải ngút đồi\nĐừng để chuyện phiền ngăn bước tiến\nTương lai xán lạn rạng niềm vui.',
    meaning: 'Mở rộng tầm nhìn, đừng bận tâm những tranh cãi nhỏ nhen.',
    ttsSummary: 'Quẻ số 56, Thượng Cát, Đăng Cao Vọng Viễn. Tầm nhìn rộng mở, bước tiến hanh thông.'
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
    number: 64,
    rank: 'Trung Cát',
    title: 'An Cư Lạc Nghiệp — Mái Ấm Bình Yên',
    poem: 'Nhà tranh ấm áp vẹn ân tình\nBếp lửa hồng soi ánh bình minh\nĐồng vợ đồng chồng cùng gắng sức\nMái ấm bình yên rạng chữ tình.',
    meaning: 'Trân trọng tổ ấm gia đình, nền tảng của sự nghiệp an lành.',
    ttsSummary: 'Quẻ số 64, Trung Cát, An Cư Lạc Nghiệp. Gia đình êm ấm, cùng nhau dựng xây.'
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
    number: 70,
    rank: 'Thượng Cát',
    title: 'Khổ Tận Cam Lai — Hết Cực Đến Vui',
    poem: 'Gian lao thử thách đã lùi xa\nVui đón tin vui rộn cửa nhà\nTrải mấy phong trần nay vững bước\nCuộc đời tươi đẹp ngát ngàn hoa.',
    meaning: 'Vượt qua giai đoạn thử thách, thời điểm an vui đang tới.',
    ttsSummary: 'Quẻ số 70, Thượng Cát, Khổ Tận Cam Lai. Vượt qua thử thách, niềm vui đón chào.'
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
    number: 75,
    rank: 'Đại Cát',
    title: 'Tri Túc Tâm Thường Lạc — Biết Đủ Tâm Thường Vui',
    poem: 'Biết đủ là vui giữa cõi đời\nChẳng màng danh lợi cuốn chơi vơi\nTâm thanh lòng tịnh thân an lạc\nNụ cười rạng rỡ nở muôn nơi.',
    meaning: 'Lòng biết đủ là nguồn gốc lớn nhất của hạnh phúc và bình an.',
    ttsSummary: 'Quẻ số 75, Đại Cát, Tri Túc Tâm Thường Lạc. Biết đủ là vui, thân tâm an lạc.'
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
    number: 85,
    rank: 'Thượng Cát',
    title: 'Văn Nhược Tinh Hà — Sao Sáng Soi Đêm',
    poem: 'Đèn sách chuyên tâm trải tháng ngày\nDùi mài kinh sử luyện tương lai\nTrí tuệ mở mang bừng ánh sáng\nCông danh rạng rỡ nét trang đài.',
    meaning: 'Khuyến khích sự học hành, trau dồi tri thức và hoàn thiện bản thân.',
    ttsSummary: 'Quẻ số 85, Thượng Cát, Văn Nhược Tinh Hà. Trau dồi tri thức, trí tuệ rạng ngời.'
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
    title: 'Hải Khoát Thiên Không — Biển Rộng Trời Cao',
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
      { field: 'event.comment', op: 'contains', value: 'xin quẻ' },
      { field: 'event.comment', op: 'contains', value: 'xin que' },
      { field: 'event.comment', op: 'contains', value: 'rút quẻ' },
      { field: 'event.comment', op: 'contains', value: 'rut que' },
      { field: 'event.comment', op: 'contains', value: 'rút xăm' },
      { field: 'event.comment', op: 'contains', value: 'rut xam' },
      { field: 'event.comment', op: 'contains', value: 'gieo quẻ' },
      { field: 'event.comment', op: 'contains', value: 'gieo que' },
      { field: 'event.comment', op: 'contains', value: 'gieo xăm' },
      { field: 'event.comment', op: 'contains', value: 'gieo xam' },
      { field: 'event.comment', op: 'contains', value: 'bốc quẻ' },
      { field: 'event.comment', op: 'contains', value: 'boc que' },
      { field: 'event.comment', op: 'contains', value: 'bốc xăm' },
      { field: 'event.comment', op: 'contains', value: 'boc xam' }
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

export const DEFAULT_SCENE_LAYERS: readonly SceneLayerConfig[] = [
  {
    id: 'background',
    name: 'Không Gian Nền / Bầu Trời',
    visible: true,
    opacity: 1.0,
    locked: false,
    assetId: null,
    assetUrl: null,
    scaleMode: 'cover',
    scaleX: 1.0,
    scaleY: 1.0,
    x: 0,
    y: 0,
    rotation: 0,
    hideProcedural: true
  },
  {
    id: 'architecture',
    name: 'Kiến Trúc Chánh Điện & Cột Đình',
    visible: true,
    opacity: 1.0,
    locked: false,
    assetId: null,
    assetUrl: null,
    scaleMode: 'cover',
    scaleX: 1.0,
    scaleY: 1.0,
    x: 0,
    y: 0,
    rotation: 0,
    hideProcedural: false
  },
  {
    id: 'altar',
    name: 'Bàn Thờ & Tượng Phật',
    visible: true,
    opacity: 1.0,
    locked: false,
    assetId: null,
    assetUrl: null,
    scaleMode: 'contain',
    scaleX: 1.0,
    scaleY: 1.0,
    x: 540,
    y: 520,
    rotation: 0,
    hideProcedural: false
  },
  {
    id: 'floor',
    name: 'Sàn Chánh Điện & Thảm Lễ Bái',
    visible: true,
    opacity: 1.0,
    locked: false,
    assetId: null,
    assetUrl: null,
    scaleMode: 'cover',
    scaleX: 1.0,
    scaleY: 1.0,
    x: 0,
    y: 0,
    rotation: 0,
    hideProcedural: false
  },
  {
    id: 'characters',
    name: 'Đạo Tràng Phật Tử & Sư Thầy',
    visible: true,
    opacity: 1.0,
    locked: false,
    scaleMode: 'contain',
    scaleX: 1.0,
    scaleY: 1.0,
    x: 0,
    y: 0,
    rotation: 0,
    hideProcedural: false
  },
  {
    id: 'ceremony',
    name: 'Nghi Lễ Tam Bái & Dâng Lễ Vật',
    visible: true,
    opacity: 1.0,
    locked: false,
    scaleMode: 'contain',
    scaleX: 1.0,
    scaleY: 1.0,
    x: 0,
    y: 0,
    rotation: 0,
    hideProcedural: false
  },
  {
    id: 'foreground',
    name: 'Hồ Sen Tiền Cảnh & Hoa Đăng',
    visible: true,
    opacity: 1.0,
    locked: false,
    assetId: null,
    assetUrl: null,
    scaleMode: 'cover',
    scaleX: 1.0,
    scaleY: 1.0,
    x: 0,
    y: 0,
    rotation: 0,
    hideProcedural: false
  },
  {
    id: 'particles',
    name: 'Khói Trầm, Mưa Sen & Sóng Âm',
    visible: true,
    opacity: 1.0,
    locked: false,
    scaleMode: 'contain',
    scaleX: 1.0,
    scaleY: 1.0,
    x: 0,
    y: 0,
    rotation: 0,
    hideProcedural: false
  },
  {
    id: 'hud',
    name: 'Khung Thông Tin & Vùng An Toàn TikTok',
    visible: true,
    opacity: 1.0,
    locked: false,
    scaleMode: 'contain',
    scaleX: 1.0,
    scaleY: 1.0,
    x: 0,
    y: 0,
    rotation: 0,
    hideProcedural: false
  }
];

export const DEFAULT_RITUAL_ANCHORS: RitualAnchorsConfig = {
  buddhaStatue: { x: 540, y: 520, scale: 1.0, visible: true },
  incenseBurner: { x: 540, y: 845, scale: 1.0, visible: true },
  woodenFish: { x: 210, y: 855, scale: 1.0, visible: true },
  templeBell: { x: 870, y: 720, scale: 1.0, visible: true },
  congregation: { yTop: 1248, yBottom: 1705, halfTop: 365, halfBottom: 475, visible: true },
  ceremony: { spawnX: 540, spawnY: 1780, kneelX: 540, kneelY: 1060, exitX: 180, exitY: 1780, visible: true }
};

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  version: '1.0.0',
  id: 'preset_sacred_hall',
  name: 'Chánh Điện Tịnh Tâm (Mặc Định)',
  ambience: 'SACRED_NIGHT',
  transitionDurationMs: 600,
  layers: [...DEFAULT_SCENE_LAYERS],
  anchors: { ...DEFAULT_RITUAL_ANCHORS },
  updatedAt: 1700000000000
};

export const BUILTIN_SCENE_PRESETS: readonly ScenePresetItem[] = [
  {
    id: 'preset_sacred_hall',
    name: 'Chánh Điện Tịnh Tâm (Truyền Thống)',
    isBuiltin: true,
    config: {
      ...DEFAULT_SCENE_CONFIG,
      id: 'preset_sacred_hall',
      name: 'Chánh Điện Tịnh Tâm (Truyền Thống)',
      ambience: 'SACRED_NIGHT'
    },
    thumbnailUrl: '/assets/preset_sacred_hall.png',
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'preset_golden_pagoda',
    name: 'Kim Các Đại Tự (Hoàng Hôn Vàng Son)',
    isBuiltin: true,
    config: {
      ...DEFAULT_SCENE_CONFIG,
      id: 'preset_golden_pagoda',
      name: 'Kim Các Đại Tự (Hoàng Hôn Vàng Son)',
      ambience: 'GOLDEN_DUSK',
      anchors: {
        ...DEFAULT_RITUAL_ANCHORS,
        buddhaStatue: { x: 540, y: 510, scale: 1.05, visible: true },
        incenseBurner: { x: 540, y: 850, scale: 1.02, visible: true }
      }
    },
    thumbnailUrl: '/assets/preset_golden_pagoda.png',
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'preset_lotus_garden',
    name: 'Ngự Uyển Sen Vàng (Ban Ngày Tịnh Minh)',
    isBuiltin: true,
    config: {
      ...DEFAULT_SCENE_CONFIG,
      id: 'preset_lotus_garden',
      name: 'Ngự Uyển Sen Vàng (Ban Ngày Tịnh Minh)',
      ambience: 'DAY_SERENE',
      anchors: {
        ...DEFAULT_RITUAL_ANCHORS,
        congregation: { yTop: 1260, yBottom: 1720, halfTop: 380, halfBottom: 490, visible: true }
      }
    },
    thumbnailUrl: '/assets/preset_lotus_garden.png',
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  },
  {
    id: 'preset_night_festival',
    name: 'Đại Lễ Hoa Đăng (Lễ Hội Rực Rỡ)',
    isBuiltin: true,
    config: {
      ...DEFAULT_SCENE_CONFIG,
      id: 'preset_night_festival',
      name: 'Đại Lễ Hoa Đăng (Lễ Hội Rực Rỡ)',
      ambience: 'FESTIVAL_GLOW',
      anchors: {
        ...DEFAULT_RITUAL_ANCHORS,
        ceremony: { spawnX: 540, spawnY: 1780, kneelX: 540, kneelY: 1040, exitX: 180, exitY: 1780, visible: true }
      }
    },
    thumbnailUrl: '/assets/preset_night_festival.png',
    createdAt: 1700000000000,
    updatedAt: 1700000000000
  }
];
