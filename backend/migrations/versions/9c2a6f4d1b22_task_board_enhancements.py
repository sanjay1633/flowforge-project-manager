"""task board enhancements

Revision ID: 9c2a6f4d1b22
Revises: 33f3c485ab79
Create Date: 2026-05-07 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "9c2a6f4d1b22"
down_revision = "33f3c485ab79"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.add_column(sa.Column("priority", sa.String(length=20), nullable=False, server_default="medium"))
        batch_op.add_column(sa.Column("label", sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column("story_points", sa.Integer(), nullable=False, server_default="1"))

    op.create_table(
        "task_comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("task_comments")
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.drop_column("story_points")
        batch_op.drop_column("label")
        batch_op.drop_column("priority")
