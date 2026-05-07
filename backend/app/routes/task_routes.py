from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.extensions import db
from app.models.task import Task, TaskComment
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User

task_bp = Blueprint("tasks", __name__)

ALLOWED_STATUS = ["todo", "in_progress", "done"]
ALLOWED_PRIORITY = ["low", "medium", "high", "urgent"]
ALLOWED_ISSUE_TYPES = ["task", "bug"]
ALLOWED_SEVERITY = ["low", "medium", "high", "critical"]

def serialize_task(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "issue_type": task.issue_type,
        "status": task.status,
        "priority": task.priority,
        "severity": task.severity,
        "label": task.label,
        "reproduction_steps": task.reproduction_steps,
        "environment": task.environment,
        "story_points": task.story_points,
        "assigned_to": task.assigned_to,
        "assignee_name": task.assignee.name if task.assignee else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "comments": [
            {
                "id": comment.id,
                "body": comment.body,
                "author_name": comment.user.name if comment.user else "Unknown",
                "created_at": comment.created_at.isoformat() if comment.created_at else None,
            }
            for comment in sorted(task.comments, key=lambda item: item.created_at or datetime.min)
        ],
    }


def parse_due_date(value):
    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def normalize_story_points(value):
    try:
        points = int(value)
    except (TypeError, ValueError):
        return None

    if points < 0 or points > 100:
        return None

    return points


def is_project_member(project_id, user_id):
    return ProjectMember.query.filter_by(project_id=project_id, user_id=user_id).first() is not None


def can_view_task(user, task):
    return task.project.created_by == user.id or is_project_member(task.project_id, user.id)


def can_manage_task(user, task):
    return user.role == "admin" and task.project.created_by == user.id

@task_bp.route("/project/<int:project_id>", methods=["POST"])
@jwt_required()
def create_task(project_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    if current_user.role != "admin" or project.created_by != current_user.id:
        return jsonify({"message": "Only the project admin can add tasks"}), 403

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    issue_type = (data.get("issue_type") or "task").strip().lower()
    assigned_to = data.get("assigned_to")
    due_date = data.get("due_date")
    priority = (data.get("priority") or "medium").strip().lower()
    severity = (data.get("severity") or "medium").strip().lower()
    label = (data.get("label") or "").strip() or None
    reproduction_steps = (data.get("reproduction_steps") or "").strip()
    environment = (data.get("environment") or "").strip() or None
    story_points = normalize_story_points(data.get("story_points", 1))

    if not title:
        return jsonify({"message": "Task title is required"}), 400

    if issue_type not in ALLOWED_ISSUE_TYPES:
        return jsonify({"message": "Issue type must be task or bug"}), 400

    if priority not in ALLOWED_PRIORITY:
        return jsonify({"message": "Priority must be low, medium, high, or urgent"}), 400

    if severity not in ALLOWED_SEVERITY:
        return jsonify({"message": "Severity must be low, medium, high, or critical"}), 400

    if issue_type == "bug" and not reproduction_steps:
        return jsonify({"message": "Reproduction steps are required for bugs"}), 400

    if story_points is None:
        return jsonify({"message": "Story points must be a number between 0 and 100"}), 400

    parsed_due_date = parse_due_date(due_date)
    if due_date and not parsed_due_date:
        return jsonify({"message": "due_date must be in YYYY-MM-DD format"}), 400

    if assigned_to:
        assigned_user = User.query.get(assigned_to)
        if not assigned_user:
            return jsonify({"message": "Assigned user not found"}), 404

        member_exists = ProjectMember.query.filter_by(project_id=project_id, user_id=assigned_to).first()
        if not member_exists:
            return jsonify({"message": "Assigned user is not a member of this project"}), 400

    task = Task(
        title=title,
        description=description,
        issue_type=issue_type,
        project_id=project_id,
        assigned_to=assigned_to,
        due_date=parsed_due_date,
        status="todo",
        priority=priority,
        severity=severity,
        label=label,
        reproduction_steps=reproduction_steps,
        environment=environment,
        story_points=story_points,
    )

    db.session.add(task)
    db.session.commit()

    return jsonify({
        "message": "Task created successfully",
        "task": {
            **serialize_task(task)
        }
    }), 201


@task_bp.route("/project/<int:project_id>", methods=["GET"])
@jwt_required()
def get_project_tasks(project_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    project = Project.query.get(project_id)
    if not project:
        return jsonify({"message": "Project not found"}), 404

    membership = ProjectMember.query.filter_by(project_id=project_id, user_id=current_user.id).first()

    if project.created_by != current_user.id and not membership:
        return jsonify({"message": "You are not allowed to view tasks for this project"}), 403

    tasks = Task.query.filter_by(project_id=project_id).all()

    result = []
    for task in tasks:
        result.append(serialize_task(task))

    return jsonify(result), 200


@task_bp.route("/<int:task_id>", methods=["PUT"])
@jwt_required()
def update_task(task_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    task = Task.query.get(task_id)
    if not task:
        return jsonify({"message": "Task not found"}), 404

    if not can_manage_task(current_user, task):
        return jsonify({"message": "Only the project admin can edit task details"}), 403

    data = request.get_json(silent=True) or {}

    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return jsonify({"message": "Task title is required"}), 400
        task.title = title

    if "description" in data:
        task.description = (data.get("description") or "").strip()

    if "issue_type" in data:
        issue_type = (data.get("issue_type") or "task").strip().lower()
        if issue_type not in ALLOWED_ISSUE_TYPES:
            return jsonify({"message": "Issue type must be task or bug"}), 400
        task.issue_type = issue_type

    if "priority" in data:
        priority = (data.get("priority") or "medium").strip().lower()
        if priority not in ALLOWED_PRIORITY:
            return jsonify({"message": "Priority must be low, medium, high, or urgent"}), 400
        task.priority = priority

    if "severity" in data:
        severity = (data.get("severity") or "medium").strip().lower()
        if severity not in ALLOWED_SEVERITY:
            return jsonify({"message": "Severity must be low, medium, high, or critical"}), 400
        task.severity = severity

    if "label" in data:
        task.label = (data.get("label") or "").strip() or None

    if "reproduction_steps" in data:
        task.reproduction_steps = (data.get("reproduction_steps") or "").strip()

    if "environment" in data:
        task.environment = (data.get("environment") or "").strip() or None

    if "story_points" in data:
        story_points = normalize_story_points(data.get("story_points"))
        if story_points is None:
            return jsonify({"message": "Story points must be a number between 0 and 100"}), 400
        task.story_points = story_points

    if "due_date" in data:
        parsed_due_date = parse_due_date(data.get("due_date"))
        if data.get("due_date") and not parsed_due_date:
            return jsonify({"message": "due_date must be in YYYY-MM-DD format"}), 400
        task.due_date = parsed_due_date

    if task.issue_type == "bug" and not task.reproduction_steps:
        return jsonify({"message": "Reproduction steps are required for bugs"}), 400

    db.session.commit()

    return jsonify({
        "message": "Task updated successfully",
        "task": serialize_task(task),
    }), 200


@task_bp.route("/<int:task_id>/status", methods=["PUT"])
@jwt_required()
def update_task_status(task_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    task = Task.query.get(task_id)
    if not task:
        return jsonify({"message": "Task not found"}), 404

    if current_user.role == "admin":
        if task.project.created_by != current_user.id:
            return jsonify({"message": "You can only update tasks in your own projects"}), 403
    elif task.assigned_to != current_user.id:
        return jsonify({"message": "You can update only your assigned tasks"}), 403

    data = request.get_json(silent=True) or {}
    status = data.get("status")

    if status not in ALLOWED_STATUS:
        return jsonify({"message": "Status must be todo, in_progress, or done"}), 400

    task.status = status
    db.session.commit()

    return jsonify({"message": "Task status updated successfully"}), 200


@task_bp.route("/<int:task_id>/assign", methods=["PUT"])
@jwt_required()
def assign_task(task_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    if current_user.role != "admin":
        return jsonify({"message": "Only admin can assign tasks"}), 403

    task = Task.query.get(task_id)
    if not task:
        return jsonify({"message": "Task not found"}), 404

    if task.project.created_by != current_user.id:
        return jsonify({"message": "You can only assign tasks in your own projects"}), 403

    data = request.get_json(silent=True) or {}
    assigned_to = data.get("assigned_to")

    if assigned_to in [None, ""]:
        task.assigned_to = None
        db.session.commit()
        return jsonify({"message": "Task unassigned successfully"}), 200

    user = User.query.get(assigned_to)
    if not user:
        return jsonify({"message": "Assigned user not found"}), 404

    member_exists = ProjectMember.query.filter_by(project_id=task.project_id, user_id=assigned_to).first()
    if not member_exists:
        return jsonify({"message": "User is not a member of this project"}), 400

    task.assigned_to = assigned_to
    db.session.commit()

    return jsonify({"message": "Task assigned successfully"}), 200


@task_bp.route("/<int:task_id>/comments", methods=["POST"])
@jwt_required()
def add_task_comment(task_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    task = Task.query.get(task_id)
    if not task:
        return jsonify({"message": "Task not found"}), 404

    if not can_view_task(current_user, task):
        return jsonify({"message": "You are not allowed to comment on this task"}), 403

    data = request.get_json(silent=True) or {}
    body = (data.get("body") or "").strip()

    if not body:
        return jsonify({"message": "Comment cannot be empty"}), 400

    comment = TaskComment(task_id=task.id, user_id=current_user.id, body=body)
    db.session.add(comment)
    db.session.commit()

    return jsonify({
        "message": "Comment added successfully",
        "task": serialize_task(task),
    }), 201
