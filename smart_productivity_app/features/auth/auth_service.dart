import 'package:firebase_auth/firebase_auth.dart';

class AuthService {
  static Future<void> signInAnonymously() async {
    final auth = FirebaseAuth.instance;
    if (auth.currentUser == null) {
      await auth.signInAnonymously();
    }
  }

  static String get uid => FirebaseAuth.instance.currentUser!.uid;
}
