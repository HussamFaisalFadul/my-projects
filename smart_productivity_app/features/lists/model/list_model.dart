class ListModel {
  final String id;
  final String title;
  final String ownerUid;
  final String shareCode;
  final List<String> members;
  final DateTime createdAt;

  ListModel({
    required this.id,
    required this.title,
    required this.ownerUid,
    required this.shareCode,
    required this.members,
    required this.createdAt,
  });

  factory ListModel.fromMap(String id, Map<String, dynamic> d) => ListModel(
    id: id,
    title: d['title'] ?? '',
    ownerUid: d['ownerUid'] ?? '',
    shareCode: d['shareCode'] ?? '',
    members: List<String>.from(d['members'] ?? []),
    createdAt: (d['createdAt'] as dynamic)?.toDate() ?? DateTime.now(),
  );

  Map<String, dynamic> toMap() => {
    'title':     title,
    'ownerUid':  ownerUid,
    'shareCode': shareCode,
    'members':   members,
    'createdAt': createdAt,
  };
}
