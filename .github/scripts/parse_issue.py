"""이슈 폼과 PR 정보에서 브랜치·제목·라벨을 생성하는 파서.

환경변수:
  WORK_ITEM_MODE — issue 또는 pull_request
  ISSUE_TITLE, ISSUE_NUMBER, ISSUE_BODY — GitHub Issue Form 값
  PR_TITLE, BRANCH_NAME — Pull Request 제목과 브랜치명

출력 (GITHUB_OUTPUT):
  branch_name  — 최종 브랜치명 (예: 1-feat/login-page)
  issue_title  — 업데이트할 이슈 제목 (예: [Feat] #1 - 로그인 페이지)
  branch_type  — 브랜치 타입 (예: feat)
  label        — GitHub 라벨 (예: ✨ Feature)
"""

import os
import re
from typing import Dict, Optional


LABEL_MAP = {
    'chore': {'name': 'CHORE', 'color': 'FFFFFF', 'description': '기타 작업'},
    'docs': {'name': 'DOCS', 'color': 'F7F6F3', 'description': '문서 수정'},
    'feat': {'name': 'FEAT', 'color': 'ECF8FF', 'description': '새로운 기능 구현'},
    'fix': {'name': 'FIX', 'color': 'FFF5F7', 'description': '버그 수정'},
    'hotfix': {'name': 'HOTFIX', 'color': 'FFF7FF', 'description': '긴급 수정'},
    'refactor': {'name': 'REFACTOR', 'color': 'F2FFF8', 'description': '코드 리팩토링'},
    'remove': {'name': 'REMOVE', 'color': 'F6F9F4', 'description': '파일 삭제'},
    'rename': {'name': 'RENAME', 'color': 'FFFBEF', 'description': '파일, 폴더명 수정 OR 이동'},
    'style': {'name': 'STYLE', 'color': 'F8F4FF', 'description': '스타일 작업'},
    'test': {'name': 'TEST', 'color': 'ECFFFF', 'description': '테스트'},
}

VALID_TYPES = set(LABEL_MAP.keys())
TYPE_ALIASES = {'feature': 'feat'}


def parse_form_field(body: str, field_label: str) -> str:
    """이슈 폼 마크다운에서 특정 필드의 첫 줄 값을 추출한다."""
    pattern = rf'^### {re.escape(field_label)}[ \t]*\n(.*?)(?=^### |\Z)'
    match = re.search(pattern, body.replace('\r\n', '\n'), re.DOTALL | re.MULTILINE)
    value = match.group(1).strip() if match else ''
    return value.split('\n')[0].strip() if value and value != '_No response_' else ''


def clean_branch_name(raw: str) -> str:
    """브랜치명을 Git 규칙에 맞게 정제한다."""
    name = raw.strip().lower()
    name = re.sub(r'\s+', '-', name)
    name = re.sub(r'[/:^~?*\[\]\\@{}.]+', '', name)
    name = re.sub(r'-{2,}', '-', name)
    return name.strip('-.') or 'issue'


def build_issue_title(branch_type: str, issue_number: str, original_title: str) -> str:
    """[Type] #번호 - 제목 형식의 이슈 제목을 생성한다."""
    original_title = re.sub(r'^\[작업\]\s*', '', original_title)
    if re.match(r'^\[[^\]]+\]', original_title):
        return original_title
    return f'[{branch_type.capitalize()}] #{issue_number} - {original_title}'


def find_type(value: str) -> Optional[str]:
    """Conventional Commit 제목, `[Type]` 제목, 번호-타입/브랜치명에서 타입을 찾는다."""
    normalized = value.strip().lower()
    patterns = (r'^(?:\d+-)?([a-z]+)/', r'^([a-z]+)(?:\([^)]+\))?!?:', r'^\[([a-z]+)\]')

    for pattern in patterns:
        match = re.match(pattern, normalized)
        if match:
            candidate = match.group(1)
            return TYPE_ALIASES.get(candidate, candidate) if TYPE_ALIASES.get(candidate, candidate) in VALID_TYPES else None

    candidate = TYPE_ALIASES.get(normalized, normalized)
    return candidate if candidate in VALID_TYPES else None


def write_output(values: Dict[str, str]) -> None:
    output_file = os.environ.get('GITHUB_OUTPUT', '')
    if not output_file:
        raise RuntimeError('GITHUB_OUTPUT is required.')

    with open(output_file, 'a', encoding='utf-8') as output:
        for key, value in values.items():
            output.write(f'{key}={value}\n')


def issue_output() -> Dict[str, str]:
    title = os.environ.get('ISSUE_TITLE', '')
    number = os.environ.get('ISSUE_NUMBER', '')
    body = os.environ.get('ISSUE_BODY', '')
    raw_branch = parse_form_field(body, '브랜치 이름') or parse_form_field(body, '🌳 브랜치명 (Branch)')
    raw_type = parse_form_field(body, '작업 타입') or parse_form_field(body, '📂 브랜치 타입')
    type_option = re.search(r'\(([a-z]+)\)\s*-', raw_type)
    branch_type = find_type(type_option.group(1) if type_option else raw_type)

    if not raw_branch or not branch_type or not re.sub(r'^\[작업\]\s*', '', title).strip():
        return {
            'matched': 'false',
            'label_names': '|'.join(details['name'] for details in LABEL_MAP.values()),
        }

    branch_name = f'{number}-{branch_type}/{clean_branch_name(raw_branch or title)}'

    return {
        'matched': 'true',
        'branch_name': branch_name,
        'issue_title': build_issue_title(branch_type, number, title),
        'branch_type': branch_type,
        'label': LABEL_MAP[branch_type]['name'],
        'label_color': LABEL_MAP[branch_type]['color'],
        'label_description': LABEL_MAP[branch_type]['description'],
        'label_names': '|'.join(details['name'] for details in LABEL_MAP.values()),
    }


def pull_request_output() -> Dict[str, str]:
    branch_type = find_type(os.environ.get('PR_TITLE', '')) or find_type(os.environ.get('BRANCH_NAME', ''))
    if not branch_type:
        return {
            'matched': 'false',
            'label_names': '|'.join(details['name'] for details in LABEL_MAP.values()),
        }

    return {
        'matched': 'true',
        'branch_type': branch_type,
        'label': LABEL_MAP[branch_type]['name'],
        'label_color': LABEL_MAP[branch_type]['color'],
        'label_description': LABEL_MAP[branch_type]['description'],
        'label_names': '|'.join(details['name'] for details in LABEL_MAP.values()),
    }


def main() -> None:
    mode = os.environ.get('WORK_ITEM_MODE', 'issue')
    if mode == 'issue':
        write_output(issue_output())
    elif mode == 'pull_request':
        write_output(pull_request_output())
    else:
        raise RuntimeError('WORK_ITEM_MODE must be issue or pull_request.')


if __name__ == '__main__':
    main()
