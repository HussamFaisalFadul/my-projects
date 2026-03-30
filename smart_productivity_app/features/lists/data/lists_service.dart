import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:uuid/uuid.dart';
import '../model/list_model.dart';
import '../../auth/auth_service.dart';

class ListsService {
  final _db = FirebaseFirestore.instance;
  final _uuid = const Uuid();

  CollectionReference get _lists => _db.collection('lists');

  String _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final rand = _uuid.v4().replaceAll('-', '');
    return List.generate(6, (i) => chars[rand.codeUnitAt(i) % chars.length]).join();
  }

  Future<ListModel> createList(String title) async {
    final uid = AuthService.uid;
    final code = _generateCode();
    final ref = _lists.doc();
    final model = ListModel(
      id: ref.id,
      title: title,
      ownerUid: uid,
      shareCode: code,
      members: [uid],
      createdAt: DateTime.now(),
    );
    await ref.set(model.toMap());
    return model;
  }

  Stream<List<ListModel>> getUserLists() {
    final uid = AuthService.uid;
    return _lists
        .where('members', arrayContains: uid)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs
            .map((d) => ListModel.fromMap(d.id, d.data() as Map<String, dynamic>))
            .toList());
  }

  Future<ListModel?> joinByCode(String code) async {
    final uid = AuthService.uid;
    final query = await _lists
        .where('shareCode', isEqualTo: code.toUpperCase())
        .limit(1)
        .get();
    if (query.docs.isEmpty) return null;
    final doc = query.docs.first;
    await doc.reference.update({
      'members': FieldValue.arrayUnion([uid]),
    });
    return ListModel.fromMap(doc.id, doc.data() as Map<String, dynamic>);
  }

  Future<void> deleteList(String listId) async {
    await _lists.doc(listId).delete();
  }
}
