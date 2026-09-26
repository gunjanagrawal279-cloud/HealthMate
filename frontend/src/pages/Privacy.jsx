export default function Privacy() {
  return (
    <div style={{ maxWidth: '650px', margin: '2rem auto', padding: '2rem' }}>
      <h2>Privacy & Security</h2>
      <ul style={{ lineHeight: '1.8' }}>
        <li>Your account is protected with secure authentication (JWT tokens).</li>
        <li>Only you can view, analyze, or delete your own health documents.</li>
        <li>Your Gemini AI API key is stored securely on the server and never exposed to the browser.</li>
        <li>Uploaded files are validated for type and size before storage.</li>
        <li>In production, this application should be served over HTTPS.</li>
        <li>This platform is for educational purposes only and does not store or share your data with third parties.</li>
      </ul>
      <p style={{ marginTop: '1.5rem', fontWeight: 'bold' }}>
        This platform provides educational information and is not a substitute for professional medical advice.
      </p>
    </div>
  );
}