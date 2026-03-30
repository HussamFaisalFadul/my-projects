import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/tasks_service.dart';
import '../model/task_model.dart';

final tasksServiceProvider = Provider((ref) => TasksService());

final tasksStreamProvider = StreamProvider.family<List<TaskModel>, String>((ref, listId) {
  return ref.watch(tasksServiceProvider).getTasks(listId);
});
