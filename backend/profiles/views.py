from rest_framework import generics, permissions
from .models import HealthProfile
from .serializers import HealthProfileSerializer


class HealthProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = HealthProfileSerializer

    def get_object(self):
        profile, created = HealthProfile.objects.get_or_create(
            user=self.request.user,
            defaults={'full_name': self.request.user.username},
        )
        return profile