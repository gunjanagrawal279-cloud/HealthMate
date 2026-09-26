from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


class ProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='StrongPass123!')
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser', 'password': 'StrongPass123!'
        })
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_get_profile_auto_creates_it(self):
        response = self.client.get('/api/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'testuser')

    def test_update_profile(self):
        response = self.client.put('/api/profile/', {
            'full_name': 'Test User', 'age': 25, 'gender': 'FEMALE',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['age'], 25)

    def test_profile_requires_authentication(self):
        client = APIClient()
        response = client.get('/api/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)