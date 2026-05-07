from app.extensions import db

class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    issue_type = db.Column(db.String(20), nullable=False, default="task")
    status = db.Column(db.String(30), nullable=False, default="todo")
    priority = db.Column(db.String(20), nullable=False, default="medium")
    severity = db.Column(db.String(20), nullable=False, default="medium")
    label = db.Column(db.String(40), nullable=True)
    reproduction_steps = db.Column(db.Text, nullable=True)
    environment = db.Column(db.String(120), nullable=True)
    story_points = db.Column(db.Integer, nullable=False, default=1)
    due_date = db.Column(db.Date, nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())


class TaskComment(db.Model):
    __tablename__ = "task_comments"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    task = db.relationship(
        "Task",
        backref=db.backref("comments", lazy=True, cascade="all, delete-orphan")
    )
    user = db.relationship("User", backref="task_comments", lazy=True)
