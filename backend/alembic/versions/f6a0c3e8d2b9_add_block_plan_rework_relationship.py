"""add block plan rework relationship

Revision ID: f6a0c3e8d2b9
Revises: e1a9c2f3b7d5
Create Date: 2026-09-25 12:00:00.000000

Controller rejection moves a block plan into REWORK_REQUIRED status. Planning
creates a revised recommendation as a NEW block_plan row; the nullable
self-referencing ``revises_plan_id`` keeps the traceable link between a
revised plan and the immutable rejected original it replaces.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a0c3e8d2b9'
down_revision: Union[str, Sequence[str], None] = 'e1a9c2f3b7d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("block_plan") as batch_op:
            batch_op.add_column(sa.Column("revises_plan_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                "fk_block_plan_revises_plan_id",
                "block_plan",
                ["revises_plan_id"],
                ["id"],
                ondelete="RESTRICT",
            )
            batch_op.create_index(
                "ix_block_plan_revises_plan_id",
                ["revises_plan_id"],
                unique=False,
            )
    else:
        op.add_column(
            "block_plan",
            sa.Column("revises_plan_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_block_plan_revises_plan_id",
            "block_plan",
            "block_plan",
            ["revises_plan_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        op.create_index(
            "ix_block_plan_revises_plan_id",
            "block_plan",
            ["revises_plan_id"],
            unique=False,
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "ix_block_plan_revises_plan_id", table_name="block_plan"
    )
    op.drop_constraint(
        "fk_block_plan_revises_plan_id", "block_plan", type_="foreignkey"
    )
    op.drop_column("block_plan", "revises_plan_id")