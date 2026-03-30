import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../lists/logic/lists_provider.dart';

class JoinListPage extends ConsumerStatefulWidget {
  const JoinListPage({super.key});
  @override
  ConsumerState<JoinListPage> createState() => _JoinListPageState();
}

class _JoinListPageState extends ConsumerState<JoinListPage> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('انضم لقائمة')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.group_add_rounded, size: 72, color: scheme.primary),
            const SizedBox(height: 24),
            Text('أدخل الرمز السري',
                style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text('اطلب من صاحب القائمة مشاركة الرمز المكون من 6 أحرف',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600])),
            const SizedBox(height: 32),
            TextField(
              controller: _controller,
              textCapitalization: TextCapitalization.characters,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                letterSpacing: 8,
                fontFamily: 'monospace',
              ),
              decoration: InputDecoration(
                hintText: 'XXXXXX',
                hintStyle: TextStyle(color: Colors.grey[400], letterSpacing: 8),
                errorText: _error,
                counterText: '',
              ),
              onChanged: (_) => setState(() => _error = null),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _loading ? null : _join,
                child: _loading
                    ? const SizedBox(
                        height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('انضمام'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _join() async {
    final code = _controller.text.trim();
    if (code.length < 6) {
      setState(() => _error = 'الرمز يجب أن يكون 6 أحرف');
      return;
    }
    setState(() { _loading = true; _error = null; });
    final result = await ref.read(listsServiceProvider).joinByCode(code);
    setState(() => _loading = false);
    if (result == null) {
      setState(() => _error = 'الرمز غير صحيح أو منتهي الصلاحية');
    } else if (mounted) {
      context.go('/list/\${result.id}');
    }
  }
}
