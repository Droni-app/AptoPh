/// Contracts of the API (`AuthSession`, `UserProfile`, `TenantSummary` in
/// packages/shared/src/api.ts).
class UserProfile {
  const UserProfile({
    required this.id,
    required this.fullName,
    required this.email,
    required this.initials,
    this.phone,
    this.emailVerifiedAt,
  });

  final String id;
  final String fullName;
  final String email;
  final String initials;
  final String? phone;
  final DateTime? emailVerifiedAt;

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'] as String,
    fullName: json['fullName'] as String,
    email: json['email'] as String,
    initials: (json['initials'] as String?) ?? '',
    phone: json['phone'] as String?,
    emailVerifiedAt: json['emailVerifiedAt'] == null
        ? null
        : DateTime.parse(json['emailVerifiedAt'] as String),
  );
}

class AuthSession {
  const AuthSession({required this.token, required this.user, this.expiresAt});

  final String token;
  final DateTime? expiresAt;
  final UserProfile user;

  factory AuthSession.fromJson(Map<String, dynamic> json) => AuthSession(
    token: json['token'] as String,
    expiresAt: json['expiresAt'] == null
        ? null
        : DateTime.parse(json['expiresAt'] as String),
    user: UserProfile.fromJson(json['user'] as Map<String, dynamic>),
  );
}

class TenantSummary {
  const TenantSummary({
    required this.id,
    required this.name,
    required this.roles,
    this.city,
  });

  final String id;
  final String name;
  final String? city;
  final List<String> roles;

  /// The app is for residents and owners (the staff uses the back-office)
  bool get isResident => roles.contains('resident');

  factory TenantSummary.fromJson(Map<String, dynamic> json) => TenantSummary(
    id: json['id'] as String,
    name: json['name'] as String,
    city: json['city'] as String?,
    roles: [for (final role in json['roles'] as List) role as String],
  );
}
