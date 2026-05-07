"""project schedule fields

Revision ID: a7d3c2f91b48
Revises: 9c2a6f4d1b22
Create Date: 2026-05-07 19:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a7d3c2f91b48"
down_revision = "9c2a6f4d1b22"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.add_column(sa.Column("start_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("deadline", sa.Date(), nullable=True))


def downgrade():
    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.drop_column("deadline")
        batch_op.drop_column("start_date")
