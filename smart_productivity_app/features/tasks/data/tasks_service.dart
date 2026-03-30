import 'package:cloud_firestore/cloud_firestore.dart';
import '../model/task_model.dart';

class TasksService {
  final _db = FirebaseFirestore.instance;

  CollectionReference _tasks(String listId) =>
      _db.collection('lists').doc(listId).collection('tasks');

  Stream<List<TaskModel>> getTasks(String listId) {
    return _tasks(listId)
        .orderBy('createdAt')
        .snapshots()
        .map((s) => s.docs
            .map((d) => TaskModel.fromMap(d.id, d.data() as Map<String, dynamic>))
            .toList());
  }

  Future<void> addTask(String listId, String title) async {
    await _tasks(listId).add({
      'title': title,
      'isDone': false,
      'listId': listId,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> toggleTask(String listId, String taskId, bool isDone) async {
    await _tasks(listId).doc(taskId).update({'isDone': isDone});
  }

  Future<void> deleteTask(String listId, String taskId) async {
    await _tasks(listId).doc(taskId).delete();
  }
}
