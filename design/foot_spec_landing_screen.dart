import 'dart:ui';
import 'package:flutter/material.dart';

/// ============================================================
/// DESIGN TOKENS — "축구화 사이즈 택" 컨셉
/// 흰카드+그림자+이모지 대신, 가죽/스터드/펀치홀 톤에서 가져온 팔레트
/// ============================================================
class FootSpecColors {
  static const ink = Color(0xFF17130F);
  static const inkSoft = Color(0xFF241D17);
  static const chalk = Color(0xFFF3ECE0);
  static const chalkDim = Color(0xFFE7DDCA);
  static const leather = Color(0xFFA9683C);
  static const leatherDark = Color(0xFF7C4C2A);
  static const turf = Color(0xFF3A5C44);
  static const stud = Color(0xFF948A7A);
}

const kBlurInCurve = Curves.easeOutCubic; // MD: Time 0.4s, ease-out
const kSheetCurve = Cubic(0.42, 0.02, 0.5, 1.0); // MD: Figma Smart Animate 스펙

/// ============================================================
/// 1) BlurInText — 제공된 MD 코드 그대로 재사용
/// ============================================================
class BlurInText extends StatefulWidget {
  final String text;
  final TextStyle? style;
  final TextAlign textAlign;
  final Duration initialDelay;

  const BlurInText({
    super.key,
    required this.text,
    this.style,
    this.textAlign = TextAlign.center,
    this.initialDelay = Duration.zero,
  });

  @override
  State<BlurInText> createState() => _BlurInTextState();
}

class _BlurInTextState extends State<BlurInText> with TickerProviderStateMixin {
  static const Duration _duration = Duration(milliseconds: 400);
  static const Duration _stagger = Duration(milliseconds: 50);

  late final List<AnimationController> _controllers;

  @override
  void initState() {
    super.initState();
    final chars = widget.text.characters.where((c) => c != '\n').toList();
    _controllers = List.generate(
      chars.length,
      (_) => AnimationController(vsync: this, duration: _duration),
    );
    for (var i = 0; i < _controllers.length; i++) {
      Future.delayed(widget.initialDelay + _stagger * i, () {
        if (mounted) _controllers[i].forward();
      });
    }
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> lines = [];
    int i = 0;
    for (final line in widget.text.split('\n')) {
      lines.add(
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final ch in line.characters)
              _AnimatedChar(char: ch, style: widget.style, controller: _controllers[i++]),
          ],
        ),
      );
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: _crossAxis(widget.textAlign),
      children: lines,
    );
  }

  CrossAxisAlignment _crossAxis(TextAlign a) {
    switch (a) {
      case TextAlign.start:
      case TextAlign.left:
        return CrossAxisAlignment.start;
      case TextAlign.end:
      case TextAlign.right:
        return CrossAxisAlignment.end;
      default:
        return CrossAxisAlignment.center;
    }
  }
}

class _AnimatedChar extends StatelessWidget {
  final AnimationController controller;
  final String char;
  final TextStyle? style;

  const _AnimatedChar({required this.controller, required this.char, this.style});

  @override
  Widget build(BuildContext context) {
    final curve = CurvedAnimation(parent: controller, curve: kBlurInCurve);
    return AnimatedBuilder(
      animation: curve,
      builder: (context, _) {
        final t = curve.value;
        final blur = 10.0 * (1 - t);
        final dy = 10.0 * (1 - t);
        Widget child = Text(char, style: style);
        if (blur > 0.05) {
          child = ImageFiltered(
            imageFilter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
            child: child,
          );
        }
        return Opacity(
          opacity: t.clamp(0.0, 1.0),
          child: Transform.translate(offset: Offset(0, dy), child: child),
        );
      },
    );
  }
}

/// ============================================================
/// 2) SlideUpKeyboard — 제공된 MD 코드 그대로 재사용 (사진 업로드 시트에 사용)
/// ============================================================
class SlideUpKeyboard extends StatelessWidget {
  const SlideUpKeyboard({
    super.key,
    required this.visible,
    required this.child,
    this.duration = const Duration(milliseconds: 500),
    this.curve = kSheetCurve,
  });

  final bool visible;
  final Widget child;
  final Duration duration;
  final Curve curve;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: !visible,
      child: AnimatedSlide(
        duration: duration,
        curve: curve,
        offset: visible ? Offset.zero : const Offset(0, 1),
        child: AnimatedOpacity(
          duration: duration,
          curve: curve,
          opacity: visible ? 1 : 0,
          child: child,
        ),
      ),
    );
  }
}

/// ============================================================
/// 3) MeasurementDiagram — 새 시그니처 요소. 발 윤곽 + 3개 측정선
/// ============================================================
class MeasurementDiagram extends StatefulWidget {
  const MeasurementDiagram({super.key});

  @override
  State<MeasurementDiagram> createState() => _MeasurementDiagramState();
}

class _MeasurementDiagramState extends State<MeasurementDiagram> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    WidgetsBinding.instance.addPostFrameCallback((_) => _controller.forward());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 20),
      decoration: BoxDecoration(
        border: Border.all(color: FootSpecColors.stud, width: 1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'FOOT SPEC / SCALE 1:1 아님',
              style: TextStyle(
                fontFamily: 'IBMPlexMono',
                fontSize: 9,
                letterSpacing: 1,
                color: FootSpecColors.stud,
              ),
            ),
          ),
          const SizedBox(height: 12),
          AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              return CustomPaint(
                size: const Size(180, 250),
                painter: _FootPainter(progress: CurvedAnimation(
                  parent: _controller,
                  curve: kBlurInCurve,
                ).value),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _FootPainter extends CustomPainter {
  final double progress; // 0 → 1, 측정선 draw-in
  _FootPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final scaleX = size.width / 300;
    final scaleY = size.height / 420;

    final outlinePaint = Paint()
      ..color = FootSpecColors.ink
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final path = Path()
      ..moveTo(150 * scaleX, 18 * scaleY)
      ..cubicTo(192 * scaleX, 18 * scaleY, 212 * scaleX, 58 * scaleY, 206 * scaleX, 112 * scaleY)
      ..cubicTo(201 * scaleX, 158 * scaleY, 222 * scaleX, 196 * scaleY, 227 * scaleX, 250 * scaleY)
      ..cubicTo(233 * scaleX, 312 * scaleY, 212 * scaleX, 372 * scaleY, 170 * scaleX, 398 * scaleY)
      ..cubicTo(138 * scaleX, 418 * scaleY, 88 * scaleX, 418 * scaleY, 62 * scaleX, 392 * scaleY)
      ..cubicTo(36 * scaleX, 366 * scaleY, 32 * scaleX, 320 * scaleY, 44 * scaleX, 268 * scaleY)
      ..cubicTo(55 * scaleX, 220 * scaleY, 39 * scaleX, 168 * scaleY, 50 * scaleX, 116 * scaleY)
      ..cubicTo(60 * scaleX, 66 * scaleY, 102 * scaleX, 18 * scaleY, 150 * scaleX, 18 * scaleY)
      ..close();
    canvas.drawPath(path, outlinePaint);

    final measurePaint = Paint()
      ..color = FootSpecColors.leather.withOpacity(progress.clamp(0.0, 1.0))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    final ys = [110.0, 230.0, 340.0];
    final labels = ['발볼 106mm', '발등 24mm', '아치 MEDIUM'];

    for (var i = 0; i < ys.length; i++) {
      final y = ys[i] * scaleY;
      final dashEnd = 260 * scaleX * progress.clamp(0.0, 1.0);
      _drawDashedLine(canvas, Offset(20 * scaleX, y), Offset(20 * scaleX + dashEnd, y), measurePaint);

      final tp = TextPainter(
        text: TextSpan(
          text: labels[i],
          style: TextStyle(
            fontFamily: 'IBMPlexMono',
            fontSize: 10,
            color: FootSpecColors.leatherDark.withOpacity(progress),
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(20 * scaleX, y - 16));
    }
  }

  void _drawDashedLine(Canvas canvas, Offset start, Offset end, Paint paint) {
    const dashWidth = 4.0;
    const dashSpace = 4.0;
    final total = (end - start).distance;
    if (total <= 0) return;
    final dir = (end - start) / total;
    double drawn = 0;
    while (drawn < total) {
      final segEnd = (drawn + dashWidth).clamp(0.0, total);
      canvas.drawLine(start + dir * drawn, start + dir * segEnd, paint);
      drawn += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant _FootPainter oldDelegate) => oldDelegate.progress != progress;
}

/// ============================================================
/// 4) SpecRow — 카드+그림자 대신 넘버링 + 점선 구분선
/// ============================================================
class SpecRow extends StatelessWidget {
  final String number;
  final String title;
  final String description;
  final bool showDivider;

  const SpecRow({
    super.key,
    required this.number,
    required this.title,
    required this.description,
    this.showDivider = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 22),
      decoration: showDivider
          ? const BoxDecoration(
              border: Border(bottom: BorderSide(color: FootSpecColors.stud, width: 1)),
            )
          : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 46,
            child: Text(
              number,
              style: TextStyle(
                fontSize: 34,
                fontWeight: FontWeight.w700,
                color: Colors.transparent,
                shadows: [
                  Shadow(color: FootSpecColors.leather, offset: const Offset(0, 0)),
                ],
                // 아웃라인 텍스트는 flutter에서 stroke text package 없이 완벽 재현은 어려워
                // 실서비스에서는 flutter_stroke_text 등 패키지 사용 권장. 여기선 근사치로 leather 컬러 사용.
                decoration: TextDecoration.none,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.w700, color: FootSpecColors.ink)),
                const SizedBox(height: 4),
                Text(description, style: const TextStyle(fontSize: 13.5, color: Color(0xFF6B6053), height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// ============================================================
/// 5) TestimonialStub — 티켓 스텁 느낌의 후기
/// ============================================================
class TestimonialStub extends StatelessWidget {
  final String quote;
  final String attribution;
  const TestimonialStub({super.key, required this.quote, required this.attribution});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(top: 24),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: FootSpecColors.stud, width: 1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('"', style: TextStyle(fontSize: 54, height: 0.5, fontWeight: FontWeight.w700, color: FootSpecColors.leather.withOpacity(0.55))),
          const SizedBox(height: 6),
          Text(quote, style: const TextStyle(fontSize: 15, fontStyle: FontStyle.italic, height: 1.5, color: FootSpecColors.inkSoft)),
          const SizedBox(height: 12),
          Text(attribution.toUpperCase(), style: const TextStyle(fontFamily: 'IBMPlexMono', fontSize: 11, letterSpacing: 1, color: FootSpecColors.stud)),
        ],
      ),
    );
  }
}

/// ============================================================
/// 6) FootSpecLandingScreen — 전체 화면 조립
/// ============================================================
class FootSpecLandingScreen extends StatefulWidget {
  const FootSpecLandingScreen({super.key});

  @override
  State<FootSpecLandingScreen> createState() => _FootSpecLandingScreenState();
}

class _FootSpecLandingScreenState extends State<FootSpecLandingScreen> {
  bool _showUploadSheet = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FootSpecColors.chalk,
      body: Stack(
        children: [
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 120),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                  // punch hole
                  Container(
                    width: 16, height: 16,
                    margin: const EdgeInsets.only(bottom: 6),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: FootSpecColors.stud, width: 2),
                      color: FootSpecColors.chalk,
                    ),
                  ),
                  Container(width: 1, height: 20, color: FootSpecColors.stud),
                  const SizedBox(height: 22),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                          decoration: BoxDecoration(
                            border: Border.all(color: FootSpecColors.leather),
                            borderRadius: BorderRadius.circular(2),
                          ),
                          child: const Text('FOOT SPEC ANALYSIS',
                              style: TextStyle(fontFamily: 'IBMPlexMono', fontSize: 11, letterSpacing: 2, color: FootSpecColors.leatherDark)),
                        ),
                        const SizedBox(height: 22),
                        const BlurInText(
                          text: '축구화 사기 전에\n발부터 재보세요',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, height: 1.15, color: FootSpecColors.ink),
                        ),
                        const SizedBox(height: 18),
                        const Text(
                          '발 사진 3장이면 발볼·발등·아치를 읽고\n1,120개 제품 중 딱 맞는 걸 골라드려요.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 15.5, height: 1.6, color: Color(0xFF4A4137)),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 28),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 28),
                    child: MeasurementDiagram(),
                  ),

                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Column(
                      children: [
                        Container(
                          decoration: const BoxDecoration(border: Border(top: BorderSide(color: FootSpecColors.stud, width: 1))),
                        ),
                        const SpecRow(number: '01', title: '발볼·발등·아치 자동 분석', description: '발 사진 3장으로 측정 — 줄자 없이도 정확하게'),
                        const SpecRow(number: '02', title: '1,120개 실제 제품 매칭', description: '다나와 실시간 최저가 기준으로 비교'),
                        const SpecRow(number: '03', title: '3가지 추천 + 이유 설명', description: '핏·스타일·절충안, 왜 맞는지까지 알려드려요', showDivider: false),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 28),
                    child: TestimonialStub(
                      quote: '발볼이 넓어서 항상 고민이었는데, 추천받은 거 바로 샀어요. 진짜 딱 맞아요.',
                      attribution: '27세 · 주 2회 풋살',
                    ),
                  ),
                ],
              ),
            ),
          ),

          // sticky CTA bar
          Positioned(
            left: 0, right: 0, bottom: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
              decoration: const BoxDecoration(
                color: FootSpecColors.ink,
                border: Border(top: BorderSide(color: FootSpecColors.leather, width: 1)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('평균 3분 · 무료',
                      style: TextStyle(fontFamily: 'IBMPlexMono', fontSize: 10.5, color: FootSpecColors.stud, letterSpacing: 1)),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: FootSpecColors.leather,
                        foregroundColor: FootSpecColors.chalk,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
                        elevation: 0,
                      ),
                      onPressed: () => setState(() => _showUploadSheet = true),
                      child: const Text('내 발 분석하기 →', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // dim overlay (탭하면 닫힘)
          if (_showUploadSheet)
            Positioned.fill(
              child: GestureDetector(
                onTap: () => setState(() => _showUploadSheet = false),
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 500),
                  curve: kSheetCurve,
                  opacity: _showUploadSheet ? 1 : 0,
                  child: Container(color: FootSpecColors.ink.withOpacity(0.55)),
                ),
              ),
            ),

          // upload sheet — MD의 SlideUpKeyboard 그대로 사용
          Positioned(
            left: 0, right: 0, bottom: 0,
            child: SlideUpKeyboard(
              visible: _showUploadSheet,
              child: Container(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
                decoration: const BoxDecoration(
                  color: FootSpecColors.chalk,
                  border: Border(top: BorderSide(color: FootSpecColors.leather, width: 1)),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(10)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 36, height: 4, margin: const EdgeInsets.only(bottom: 18),
                        decoration: BoxDecoration(color: FootSpecColors.stud, borderRadius: BorderRadius.circular(2))),
                    const Align(alignment: Alignment.centerLeft, child: Text('발 사진 3장을 올려주세요', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700))),
                    const SizedBox(height: 4),
                    const Align(alignment: Alignment.centerLeft, child: Text('정면 · 측면(안쪽) · 측면(바깥쪽), 양말 벗고 촬영하면 더 정확해요', style: TextStyle(fontSize: 12.5, color: Color(0xFF6B6053)))),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        _uploadBox('정면'),
                        const SizedBox(width: 10),
                        _uploadBox('측면(안)'),
                        const SizedBox(width: 10),
                        _uploadBox('측면(밖)'),
                      ],
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: FootSpecColors.turf,
                          foregroundColor: FootSpecColors.chalk,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(3)),
                          elevation: 0,
                        ),
                        onPressed: () {},
                        child: const Text('분석 시작하기', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ),
                    TextButton(
                      onPressed: () => setState(() => _showUploadSheet = false),
                      child: const Text('닫기', style: TextStyle(fontFamily: 'IBMPlexMono', fontSize: 11, color: FootSpecColors.stud, decoration: TextDecoration.underline)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _uploadBox(String label) {
    return Expanded(
      child: AspectRatio(
        aspectRatio: 1,
        child: Container(
          decoration: BoxDecoration(
            border: Border.all(color: FootSpecColors.stud, width: 1.5, style: BorderStyle.solid),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Center(
            child: Text('$label\n+', textAlign: TextAlign.center,
                style: const TextStyle(fontFamily: 'IBMPlexMono', fontSize: 10.5, color: FootSpecColors.stud)),
          ),
        ),
      ),
    );
  }
}
