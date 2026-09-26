from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_user_and_returns_tokens(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'testuser', 'email': 'test@example.com', 'password': 'StrongPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(User.objects.filter(username='testuser').exists())

    def test_register_duplicate_username_fails(self):
        User.objects.create_user(username='testuser', password='StrongPass123!')
        response = self.client.post('/api/auth/register/', {
            'username': 'testuser', 'email': 'x@example.com', 'password': 'StrongPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_correct_credentials(self):
        User.objects.create_user(username='testuser', password='StrongPass123!')
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser', 'password': 'StrongPass123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_login_with_wrong_password_fails(self):
        User.objects.create_user(username='testuser', password='StrongPass123!')
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser', 'password': 'WrongPassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_requires_authentication(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)