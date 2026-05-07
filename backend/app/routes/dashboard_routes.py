from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
from app.models.user import User
from app.models.task import Task
from app.models.project import Project
from app.models.project_member import ProjectMember

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/", methods=["GET"])
@jwt_required()
def get_dashboard():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))

    if not current_user:
        return jsonify({"message": "User not found"}), 404

    today = date.today()

    if current_user.role == "admin":
        projects = Project.query.filter_by(created_by=current_user.id).all()
        project_ids = [project.id for project in projects]

        if project_ids:
            tasks = Task.query.filter(Task.project_id.in_(project_ids)).all()
        else:
            tasks = []
    else:
        memberships = ProjectMember.query.filter_by(user_id=current_user.id).all()
        project_ids = [membership.project_id for membership in memberships]

        if project_ids:
            tasks = Task.query.filter(Task.project_id.in_(project_ids)).all()
        else:
            tasks = []

    total_tasks = len(tasks)
    completed_tasks = len([task for task in tasks if task.status == "done"])
    in_progress_tasks = len([task for task in tasks if task.status == "in_progress"])
    todo_tasks = len([task for task in tasks if task.status == "todo"])
    overdue_tasks = len([
        task for task in tasks
        if task.due_date and task.due_date < today and task.status != "done"
    ])
    bug_tasks = [task for task in tasks if task.issue_type == "bug"]
    open_bugs = len([task for task in bug_tasks if task.status != "done"])
    critical_bugs = len([
        task for task in bug_tasks
        if task.severity == "critical" and task.status != "done"
    ])

    my_tasks = len([task for task in tasks if task.assigned_to == current_user.id])

    return jsonify({
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "todo_tasks": todo_tasks,
        "overdue_tasks": overdue_tasks,
        "total_bugs": len(bug_tasks),
        "open_bugs": open_bugs,
        "critical_bugs": critical_bugs,
        "my_tasks": my_tasks
    }), 200
