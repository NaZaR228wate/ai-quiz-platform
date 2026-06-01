"""create attempts

Revision ID: 0006_create_attempts
Revises: 0005_create_quizzes
Create Date: 2026-05-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0006_create_attempts"
down_revision: Union[str, Sequence[str], None] = "0005_create_quizzes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quiz_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quiz_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["quiz_id"], ["quizzes.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_quiz_attempts_quiz_id"), "quiz_attempts", ["quiz_id"], unique=False)
    op.create_index(op.f("ix_quiz_attempts_student_id"), "quiz_attempts", ["student_id"], unique=False)

    op.create_table(
        "quiz_attempt_answers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("attempt_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("selected_option_id", sa.Integer(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["quiz_attempts.id"]),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"]),
        sa.ForeignKeyConstraint(["selected_option_id"], ["quiz_options.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_quiz_attempt_answers_attempt_id"), "quiz_attempt_answers", ["attempt_id"], unique=False)
    op.create_index(op.f("ix_quiz_attempt_answers_question_id"), "quiz_attempt_answers", ["question_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_quiz_attempt_answers_question_id"), table_name="quiz_attempt_answers")
    op.drop_index(op.f("ix_quiz_attempt_answers_attempt_id"), table_name="quiz_attempt_answers")
    op.drop_table("quiz_attempt_answers")
    op.drop_index(op.f("ix_quiz_attempts_student_id"), table_name="quiz_attempts")
    op.drop_index(op.f("ix_quiz_attempts_quiz_id"), table_name="quiz_attempts")
    op.drop_table("quiz_attempts")
