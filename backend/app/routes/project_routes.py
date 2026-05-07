from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
from app.extensions import db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User

project_bp = Blueprint("projects", __name__)

def parse_date(value):
    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def get_project_status(project):
    today = date.today()
    tasks = list(project.tasks)
    total_tasks = len(tasks)
    completed_tasks = len([task for task in tasks if task.status == "done"])

    if total_tasks and completed_tasks == total_tasks:
        return "completed"

    if project.deadline and project.deadline < today:
        return "overdue"

    if project.start_date and project.start_date > today:
        return "scheduled"

    if total_tasks:
        return "in_progress"

    return "planning"


def serialize_project(project):
    tasks = list(project.tasks)
    total_tasks = len(tasks)
    completed_tasks = len([task for task in tasks if task.status == "done"])
    assigned_members = sorted({
        task.assignee.name
        for task in tasks
        if task.assignee
    })

    return {
        "id": project.id,
        "title": project.title,
        "description": project.description,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "deadline": project.deadline.isoformat() if project.deadline else None,
        "status": get_project_status(project),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "progress": round((completed_tasks / total_tasks) * 100) if total_tasks else 0,
        "assigned_members": assigned_members,
        "created_by": project.created_by,
        "created_at": project.created_at.isoformat() if project.created_at else None,
    }


def serialize_member(member):
    return {
        "id": member.user.id,
        "name": member.user.name,
        "email": member.user.email,
        "role": member.user.role,
        "joined_at": member.joined_at.isoformat() if member.joined_at else None,
    }


def get_owned_project_or_response(project_id, current_user):
    project = Project.query.get(project_id)
    if not project:
        return None, (jsonify({"message": "Project not found"}), 404)

    if current_user.role != "admin":
        return None, (jsonify({"message": "Only admin can add members"}), 403)

    if project.created_by != current_user.id:
        return None, (jsonify({"message": "You can only manage your own projects"}), 403)

    return project, None

@project_bp.route("/", methods=["POST"])
@jwt_required()
def create_project():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    if current_user.role != "admin":
        return jsonify({"message": "Only admin can create projects"}), 403

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    start_date = parse_date(data.get("start_date"))
    deadline = parse_date(data.get("deadline"))

    if not title:
        return jsonify({"message": "Project title is required"}), 400

    if data.get("start_date") and not start_date:
        return jsonify({"message": "start_date must be in YYYY-MM-DD format"}), 400

    if data.get("deadline") and not deadline:
        return jsonify({"message": "deadline must be in YYYY-MM-DD format"}), 400

    if start_date and deadline and deadline < start_date:
        return jsonify({"message": "Deadline cannot be before start date"}), 400

    project = Project(
        title=title,
        description=description,
        start_date=start_date,
        deadline=deadline,
        created_by=current_user.id
    )

    db.session.add(project)
    db.session.commit()

    creator_member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id
    )
    db.session.add(creator_member)
    db.session.commit()

    return jsonify({
        "message": "Project created successfully",
        "project": {
            **serialize_project(project)
        }
    }), 201


@project_bp.route("/", methods=["GET"])
@jwt_required()
def get_projects():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    if current_user.role == "admin":
        projects = Project.query.filter_by(created_by=current_user.id).all()
    else:
        memberships = ProjectMember.query.filter_by(user_id=current_user.id).all()
        project_ids = [m.project_id for m in memberships]

        if not project_ids:
            return jsonify([]), 200

        projects = Project.query.filter(Project.id.in_(project_ids)).all()

    result = []
    for project in projects:
        result.append(serialize_project(project))

    return jsonify(result), 200


@project_bp.route("/<int:project_id>", methods=["PUT"])
@jwt_required()
def update_project(project_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    if current_user.role != "admin" or project.created_by != current_user.id:
        return jsonify({"message": "You can only update your own projects"}), 403

    data = request.get_json(silent=True) or {}

    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return jsonify({"message": "Project title is required"}), 400
        project.title = title

    if "description" in data:
        project.description = (data.get("description") or "").strip()

    if "start_date" in data:
        start_date = parse_date(data.get("start_date"))
        if data.get("start_date") and not start_date:
            return jsonify({"message": "start_date must be in YYYY-MM-DD format"}), 400
        project.start_date = start_date

    if "deadline" in data:
        deadline = parse_date(data.get("deadline"))
        if data.get("deadline") and not deadline:
            return jsonify({"message": "deadline must be in YYYY-MM-DD format"}), 400
        project.deadline = deadline

    if project.start_date and project.deadline and project.deadline < project.start_date:
        return jsonify({"message": "Deadline cannot be before start date"}), 400

    db.session.commit()

    return jsonify({
        "message": "Project updated successfully",
        "project": serialize_project(project),
    }), 200


@project_bp.route("/<int:project_id>/members", methods=["POST"])
@jwt_required()
def add_member(project_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    project, error_response = get_owned_project_or_response(project_id, current_user)
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    existing_member = ProjectMember.query.filter_by(
        project_id=project_id,
        user_id=user_id
    ).first()

    if existing_member:
        return jsonify({"message": "User already added to project"}), 409

    member = ProjectMember(project_id=project_id, user_id=user_id)
    db.session.add(member)
    db.session.commit()

    return jsonify({"message": "Member added successfully"}), 201


@project_bp.route("/<int:project_id>/members/bulk", methods=["POST"])
@jwt_required()
def add_members_bulk(project_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    project, error_response = get_owned_project_or_response(project_id, current_user)
    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}
    members = data.get("members") or []

    if not isinstance(members, list) or not members:
        return jsonify({"message": "At least one member is required"}), 400

    if len(members) > 25:
        return jsonify({"message": "You can add up to 25 members at a time"}), 400

    added = []
    skipped = []
    errors = []

    for index, member_data in enumerate(members, start=1):
        if not isinstance(member_data, dict):
            errors.append({"row": index, "message": "Member details must be an object"})
            continue

        user_id = member_data.get("user_id")
        name = (member_data.get("name") or "").strip()
        email = (member_data.get("email") or "").strip().lower()
        role = (member_data.get("role") or "member").strip().lower()
        password = member_data.get("password")

        if role not in ["admin", "member"]:
            errors.append({"row": index, "message": "Role must be admin or member"})
            continue

        if user_id:
            user = User.query.get(user_id)
            if not user:
                errors.append({"row": index, "message": "User not found"})
                continue
        else:
            if not email:
                errors.append({"row": index, "message": "Email is required"})
                continue

            user = User.query.filter_by(email=email).first()

            if not user:
                if not name or not password:
                    errors.append({
                        "row": index,
                        "message": "Name and initial password are required for new users"
                    })
                    continue

                user = User(name=name, email=email, role=role)
                user.set_password(password)
                db.session.add(user)
                db.session.flush()

        existing_member = ProjectMember.query.filter_by(
            project_id=project.id,
            user_id=user.id
        ).first()

        if existing_member:
            skipped.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "reason": "Already on this project",
            })
            continue

        member = ProjectMember(project_id=project.id, user_id=user.id)
        db.session.add(member)
        db.session.flush()
        added.append(serialize_member(member))

    if errors:
        db.session.rollback()
        return jsonify({
            "message": "Some member rows need attention",
            "errors": errors,
        }), 400

    db.session.commit()

    return jsonify({
        "message": f"Added {len(added)} member(s)",
        "added": added,
        "skipped": skipped,
    }), 201


@project_bp.route("/<int:project_id>/members", methods=["GET"])
@jwt_required()
def get_project_members(project_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    membership = ProjectMember.query.filter_by(
        project_id=project_id,
        user_id=current_user.id
    ).first()

    if project.created_by != current_user.id and not membership:
        return jsonify({"message": "You are not allowed to view this project team"}), 403

    members = ProjectMember.query.filter_by(project_id=project_id).all()

    return jsonify([serialize_member(member) for member in members]), 200
