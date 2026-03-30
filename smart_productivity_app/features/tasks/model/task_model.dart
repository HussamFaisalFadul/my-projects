class TaskModel {
  final String id;
  final String title;
  final bool isDone;
  final String listId;
  final DateTime createdAt;

  TaskModel({
    required this.id,
    required this.title,
    required this.isDone,
    required this.listId,
    required this.createdAt,
  });

  factory TaskModel.fromMap(String id, Map<String, dynamic> d) => TaskModel(
    id: id,
    title: d['title'] ?? '',
    isDone: d['isDone'] ?? false,
    listId: d['listId'] ?? '',
    createdAt: (d['createdAt'] as dynamic)?.toDate() ?? DateTime.now(),
  );

  Map<String, dynamic> toMap() => {
    'title':     title,
    'isDone':    isDone,
    'listId':    listId,
    'createdAt': createdAt,
  };

  TaskModel copyWith({bool? isDone}) => TaskModel(
    id: id,
    title: title,
    isDone: isDone ?? this.isDone,
    listId: listId,
    createdAt: createdAt,
  );
}
