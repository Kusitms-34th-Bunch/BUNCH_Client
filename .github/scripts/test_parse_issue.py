import os
from pathlib import Path
import re
import unittest
from unittest.mock import patch

from parse_issue import LABEL_MAP, find_type, issue_output, pull_request_output


def parse_issue(body, title='[작업] 공통 페이지 틀'):
    with patch.dict(os.environ, ISSUE_BODY=body, ISSUE_TITLE=title, ISSUE_NUMBER='42'):
        return issue_output()


class IssueMetadataTests(unittest.TestCase):
    def test_every_template_option_produces_existing_metadata(self):
        template = (Path(__file__).parents[1] / 'ISSUE_TEMPLATE/issue.yml').read_text()
        options = re.findall(r'^        - (.+\(([a-z]+)\) - .+)$', template, re.MULTILINE)
        self.assertEqual({code for _, code in options}, set(LABEL_MAP))
        self.assertEqual(len(options), len(LABEL_MAP))
        for option, code in options:
            for newline in ('\n', '\r\n'):
                with self.subTest(code=code, newline=repr(newline)):
                    body = '\n'.join([
                        '### 작업 타입', '', option, '',
                        '### 브랜치 이름', '', 'page-shell', '',
                        '### 📌 작업 설명', '', '여러 줄', '설명', '',
                        '### 🛠️ 작업 목록', '', '- [ ] 구현', '',
                        '### ✅ 참고 자료 (선택)', '', '_No response_',
                    ]).replace('\n', newline)
                    result = parse_issue(body)
                    self.assertEqual(result['matched'], 'true')
                    self.assertEqual(result['branch_name'], f'42-{code}/page-shell')
                    self.assertEqual(result['issue_title'], f'[{code.capitalize()}] #42 - 공통 페이지 틀')
                    self.assertEqual(result['label'], LABEL_MAP[code]['name'])
                    self.assertEqual(result['label_color'], LABEL_MAP[code]['color'])
                    self.assertEqual(result['label_description'], LABEL_MAP[code]['description'])

    def test_legacy_form_and_branch_cleanup(self):
        for code in LABEL_MAP:
            with self.subTest(code=code):
                body = f'### 🌳 브랜치명 (Branch)\n\nPage Shell\n\n### 📂 브랜치 타입\n\n{code}'
                result = parse_issue(body, '공통 페이지 틀')
                self.assertEqual(result['branch_name'], f'42-{code}/page-shell')
                self.assertEqual(result['issue_title'], f'[{code.capitalize()}] #42 - 공통 페이지 틀')

    def test_existing_typed_title_is_preserved(self):
        body = '### 작업 타입\n\nfeat\n\n### 브랜치 이름\n\npage-shell'
        self.assertEqual(parse_issue(body, '[Feat] #42 - 기존 제목')['issue_title'], '[Feat] #42 - 기존 제목')

    def test_default_prefix_requires_a_subject(self):
        body = '### 작업 타입\n\nfeat\n\n### 브랜치 이름\n\npage-shell'
        for title in ('[작업] ', '[작업]', '[작업]   ', ''):
            with self.subTest(title=title):
                self.assertEqual(parse_issue(body, title)['matched'], 'false')

    def test_missing_empty_or_invalid_fields_do_not_match(self):
        for code, branch in [('unknown', 'page-shell'), ('', 'page-shell'), ('feat', ''), ('feat', '_No response_')]:
            with self.subTest(code=code, branch=branch):
                body = f'### 작업 타입\n\n{code}\n\n### 브랜치 이름\n\n{branch}\n\n### 📌 작업 설명\n\n본문'
                self.assertEqual(parse_issue(body)['matched'], 'false')
        self.assertEqual(parse_issue('### 📌 작업 설명\n\n내용')['matched'], 'false')

    def test_pr_type_rules_are_unchanged(self):
        for value in ('[Feat] 페이지 틀', 'feat(web): 페이지 틀', '42-feat/page-shell', 'feature'):
            with self.subTest(value=value):
                self.assertEqual(find_type(value), 'feat')
        self.assertIsNone(find_type('✨ Feature (feat) - 새 기능'))
        with patch.dict(os.environ, PR_TITLE='일반 제목', BRANCH_NAME='42-fix/page-shell'):
            self.assertEqual(pull_request_output()['label'], 'FIX')


if __name__ == '__main__':
    unittest.main()
