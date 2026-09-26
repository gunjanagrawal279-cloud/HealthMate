from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import HealthDocument


class DocumentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='alice', password='StrongPass123!')
        self.other_user = User.objects.create_user(username='bob', password='StrongPass123!')

        response = self.client.post('/api/auth/login/', {
            'username': 'alice', 'password': 'StrongPass123!'
        })
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def _make_pdf(self):
        # A minimal valid-looking PDF byte stream for upload validation testing
        content = b'%PDF-1.4\n%Test PDF\n'
        return SimpleUploadedFile('test.pdf', content, content_type='application/pdf')

    def test_upload_requires_pdf_extension(self):
        bad_file = SimpleUploadedFile('test.txt', b'not a pdf', content_type='text/plain')
        response = self.client.post('/api/documents/upload/', {
            'title': 'Bad File', 'document_type': 'OTHER', 'file': bad_file,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_valid_pdf_succeeds(self):
        response = self.client.post('/api/documents/upload/', {
            'title': 'My Report', 'document_type': 'BLOOD_TEST', 'file': self._make_pdf(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['analysis_status'], 'PENDING')

    def test_user_cannot_see_others_documents(self):
        doc = HealthDocument.objects.create(
            user=self.other_user, title="Bob's report", document_type='OTHER',
            file=self._make_pdf(),
        )
        response = self.client.get(f'/api/documents/{doc.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_document_list_only_shows_own_documents(self):
        HealthDocument.objects.create(
            user=self.other_user, title="Bob's report", document_type='OTHER', file=self._make_pdf(),
        )
        HealthDocument.objects.create(
            user=self.user, title="Alice's report", document_type='OTHER', file=self._make_pdf(),
        )
        response = self.client.get('/api/documents/')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Alice's report")