import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
} from '@mui/material';

const API_URL = 'https://dc0a0cd1-d240-48be-b952-7bccd36ae096-00-1anh6iywojxcz.janeway.replit.dev/api/admin';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (endpoint) => {
    try {
      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      } else {
        setMsg(data.msg || 'Authentication failed');
      }
    } catch {
      setMsg('Network error');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box mt={10} p={4} boxShadow={3} borderRadius={2} bgcolor="white">
        <Typography variant="h5" textAlign="center" gutterBottom>
          Admin Login 
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleAuth('login')}
              fullWidth
            >
              Login
            </Button>
            {/* <Button
              variant="contained"
              color="success"
              onClick={() => handleAuth('signup')}
              fullWidth
            >
              Sign Up
            </Button> */}
          </Stack>

          {msg && <Alert severity="warning">{msg}</Alert>}
        </Stack>
      </Box>
    </Container>
  );
}
