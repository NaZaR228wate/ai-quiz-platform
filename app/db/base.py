from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.modules.users import models  # noqa: E402,F401
from app.modules.courses import models  # noqa: E402,F401
from app.modules.topics import models  # noqa: E402,F401
from app.modules.materials import models  # noqa: E402,F401
from app.modules.quizzes import models  # noqa: E402,F401
from app.modules.question_bank import models  # noqa: E402,F401
from app.modules.sessions import models  # noqa: E402,F401
from app.modules.attempts import models  # noqa: E402,F401
