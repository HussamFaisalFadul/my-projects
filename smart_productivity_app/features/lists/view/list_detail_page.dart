import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../tasks/logic/tasks_provider.dart';
import '../../tasks/model/task_model.dart';
import '../logic/lists_provider.dart';

class ListDetailPage extends ConsumerWidget {
  final String listId;
  const ListDetailPage({super.key, required this.listId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasksAsync = ref.watch(tasksStreamProvider(listId));
    final listsAsync = ref.watch(listsStreamProvider);
    final listTitle = listsAsync.valueOrNull
        ?.where((l) => l.id == listId).firstOrNull?.title ?? 'القائمة';
    final shareCode = listsAsync.valueOrNull
        ?.where((l) => l.id == listId).firstOrNull?.shareCode ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Text(listTitle),
        actions: [
          if (shareCode.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ActionChip(
                avatar: const Icon(Icons.key_rounded, size: 16),
                label: Text(shareCode, style: const TextStyle(
                    fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: shareCode));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تم نسخ الرمز!')),
                  );
                },
              ),
            ),
        ],
      ),
      body: tasksAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('خطأ: \$e')),
        data: (tasks) {
          final done = tasks.where((t) => t.isDone).length;
          return Column(
            children: [
              if (tasks.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('\$done / \${tasks.length} مكتملة',
                              style: TextStyle(color: Colors.grey[600])),
                          Text('\${(done / tasks.length * 100).toInt()}%',
                              style: TextStyle(
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      LinearProgressIndicator(
                        value: tasks.isEmpty ? 0 : done / tasks.length,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ],
                  ),
                ),
              Expanded(
                child: tasks.isEmpty
                    ? const Center(child: Text('لا توجد مهام بعد'))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: tasks.length,
                        itemBuilder: (ctx, i) => _TaskTile(
                          key: ValueKey(tasks[i].id),
                          task: tasks[i],
                          listId: listId,
                        ),
                      ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddTask(context, ref),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showAddTask(BuildContext context, WidgetRef ref) {
    final controller = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20, right: 20, top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                autofocus: true,
                decoration: const InputDecoration(hintText: 'مهمة جديدة...'),
                onSubmitted: (v) async {
                  if (v.trim().isEmpty) return;
                  await ref.read(tasksServiceProvider).addTask(listId, v.trim());
                  if (ctx.mounted) Navigator.pop(ctx);
                },
              ),
            ),
            const SizedBox(width: 12),
            FilledButton(
              onPressed: () async {
                final title = controller.text.trim();
                if (title.isEmpty) return;
                await ref.read(tasksServiceProvider).addTask(listId, title);
                if (ctx.mounted) Navigator.pop(ctx);
              },
              child: const Text('إضافة'),
            ),
          ],
        ),
      ),
    );
  }
}

class _TaskTile extends ConsumerWidget {
  final TaskModel task;
  final String listId;
  const _TaskTile({super.key, required this.task, required this.listId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Dismissible(
      key: ValueKey(task.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: Colors.red[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.delete_outline, color: Colors.red),
      ),
      onDismissed: (_) =>
          ref.read(tasksServiceProvider).deleteTask(listId, task.id),
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: CheckboxListTile(
          value: task.isDone,
          onChanged: (v) =>
              ref.read(tasksServiceProvider).toggleTask(listId, task.id, v!),
          title: Text(
            task.title,
            style: TextStyle(
              decoration: task.isDone ? TextDecoration.lineThrough : null,
              color: task.isDone ? Colors.grey : null,
            ),
          ),
          controlAffinity: ListTileControlAffinity.leading,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}
