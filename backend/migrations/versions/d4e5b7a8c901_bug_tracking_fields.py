"""bug tracking fields

Revision ID: d4e5b7a8c901
Revises: a7d3c2f91b48
Create Date: 2026-05-07 19:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d4e5b7a8c901"
down_revision = "a7d3c2f91b48"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.add_column(sa.Column("issue_type", sa.String(length=20), nullable=False, server_default="task"))
        batch_op.add_column(sa.Column("severity", sa.String(length=20), nullable=False, server_default="medium"))
        batch_op.add_column(sa.Column("reproduction_steps", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("environment", sa.String(length=120), nullable=True))


def downgrade():
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.drop_column("environment")
        batch_op.drop_column("reproduction_steps")
        batch_op.drop_column("severity")
        batch_op.drop_column("issue_type")
