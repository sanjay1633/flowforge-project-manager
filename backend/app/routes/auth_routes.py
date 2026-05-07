from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({"message": "Name, email and password are required"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already exists"}), 409

    user = User(name=name, email=email, role="member")
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Signup successful"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    }), 200


@auth_bp.route("/users", methods=["GET"])
@jwt_required()
def get_users():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    if current_user.role != "admin":
        return jsonify({"message": "Only admin can view users"}), 403

    project_id = request.args.get("project_id", type=int)
    if project_id:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({"message": "Project not found"}), 404

        if project.created_by != current_user.id:
            return jsonify({"message": "You can only view users for your own projects"}), 403

        member_ids = {
            member.user_id
            for member in ProjectMember.query.filter_by(project_id=project_id).all()
        }
        users = User.query.filter(~User.id.in_(member_ids)).order_by(User.name.asc()).all()

        return jsonify([
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
            }
            for user in users
        ]), 200

    owned_project_ids = [
        project.id for project in Project.query.filter_by(created_by=current_user.id).all()
    ]
    visible_user_ids = {current_user.id}

    if owned_project_ids:
        memberships = ProjectMember.query.filter(
            ProjectMember.project_id.in_(owned_project_ids)
        ).all()
        visible_user_ids.update(member.user_id for member in memberships)

    users = User.query.filter(User.id.in_(visible_user_ids)).order_by(User.name.asc()).all()

    return jsonify([
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        }
        for user in users
    ]), 200
