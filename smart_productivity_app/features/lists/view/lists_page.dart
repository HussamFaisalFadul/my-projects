import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../logic/lists_provider.dart';
import '../model/list_model.dart';

class ListsPage extends ConsumerWidget {
  const ListsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listsAsync = ref.watch(listsStreamProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('قوائمي'),
        actions: [
          IconButton(
            icon: const Icon(Icons.group_add_rounded),
            tooltip: 'انضم بالرمز',
            onPressed: () => context.push('/join'),
          ),
        ],
      ),
      body: listsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('خطأ: $e')),
        data: (lists) => lists.isEmpty
            ? _EmptyState(onCreate: () => _showCreateDialog(context, ref))
            : ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: lists.length,
          itemBuilder: (ctx, i) => _ListCard(list: lists[i]),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDialog(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('قائمة جديدة'),
      ),
    );
  }

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('قائمة جديدة'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'اسم القائمة...'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('إلغاء')),
          FilledButton(
            onPressed: () async {
              final title = controller.text.trim();
              if (title.isEmpty) return;
              await ref.read(listsServiceProvider).createList(title);
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('إنشاء'),
          ),
        ],
      ),
    );
  }
}

class _ListCard extends ConsumerWidget {
  final ListModel list;
  const _ListCard({required this.list});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          // ── صف العنوان ──
          ListTile(
            contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            leading: CircleAvatar(
              backgroundColor: scheme.primaryContainer,
              child: Text(
                list.title.isNotEmpty ? list.title[0].toUpperCase() : '?',
                style: TextStyle(color: scheme.primary),
              ),
            ),
            title: Text(list.title,
                style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(
              '${list.members.length} أعضاء',
              style: TextStyle(color: Colors.grey[600], fontSize: 12),
            ),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => context.push('/list/${list.id}'),
          ),

          // ── شريط الرمز السري ──
          Container(
            margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: scheme.primaryContainer.withOpacity(0.4),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.key_rounded, size: 18, color: scheme.primary),
                const SizedBox(width: 8),
                Text(
                  'رمز المشاركة:',
                  style: TextStyle(color: Colors.grey[700], fontSize: 13),
                ),
                const SizedBox(width: 8),
                // ── الرمز ──
                Text(
                  list.shareCode,
                  style: TextStyle(
                    color: scheme.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    letterSpacing: 4,
                    fontFamily: 'monospace',
                  ),
                ),
                const Spacer(),
                // ── زر نسخ ──
                IconButton(
                  icon: const Icon(Icons.copy_rounded),
                  iconSize: 20,
                  color: scheme.primary,
                  tooltip: 'نسخ الرمز',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: list.shareCode));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                            'تم نسخ الرمز: ${list.shareCode}'),
                        behavior: SnackBarBehavior.floating,
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                ),
                // ── زر مشاركة ──
                IconButton(
                  icon: const Icon(Icons.share_rounded),
                  iconSize: 20,
                  color: scheme.primary,
                  tooltip: 'مشاركة',
                  onPressed: () => _shareCode(context, list),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _shareCode(BuildContext context, ListModel list) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('شارك قائمة "${list.title}"',
                style: const TextStyle(
                    fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('أرسل هذا الرمز لصديقك ليتمكن من الانضمام',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 24),
            // ── الرمز الكبير ──
            Container(
              padding:
              const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                list.shareCode,
                style: TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 8,
                  color: Theme.of(context).colorScheme.primary,
                  fontFamily: 'monospace',
                ),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.copy_rounded),
                    label: const Text('نسخ'),
                    onPressed: () {
                      Clipboard.setData(
                          ClipboardData(text: list.shareCode));
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('تم نسخ الرمز!'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onCreate;
  const _EmptyState({required this.onCreate});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.checklist_rounded, size: 80, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text('لا توجد قوائم بعد',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text('أنشئ قائمة جديدة أو انضم لقائمة موجودة',
              style: TextStyle(color: Colors.grey[600])),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(Icons.add),
            label: const Text('إنشاء قائمة'),
          ),
        ],
      ),
    );
  }
}