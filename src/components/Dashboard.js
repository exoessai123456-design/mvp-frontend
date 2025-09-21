import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, MenuItem, Table, TableHead, TableBody, TableRow, TableCell, Typography, IconButton
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import NavBar from '../components/NavBar';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import Papa from 'papaparse';

const HOURS = Array.from({ length: 17 }, (_, i) => 8 + i); // 08:00 to 00:00
function formatHour(h) {
  if (typeof h !== 'number') return '';
  return h === 24 ? '00:00' : `${h.toString().padStart(2, '0')}:00`;
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [openDayModal, setOpenDayModal] = useState(false);
  const [openEventForm, setOpenEventForm] = useState(false);
  const [editingHour, setEditingHour] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', type: 'Point', status: 'CONFIRMED' });
  const [errors, setErrors] = useState({});
  const [originalStatus, setOriginalStatus] = useState('CONFIRMED');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const API_BASE = "https://mvp-backend-puce.vercel.app/api";
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE}/auth/profile`, { headers: authHeaders })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(setProfile)
      .catch(() => localStorage.removeItem('token'));

    fetch(`${API_BASE}/events`, { headers: authHeaders })
      .then(res => res.json())
      .then(data => {
        // ✅ Shift only the calendar display time by -2 hours
        const shifted = data.map(ev => ({
          ...ev,
          start: new Date(new Date(ev.date).getTime() - 2 * 60 * 60 * 1000).toISOString(),
          end: ev.end
            ? new Date(new Date(ev.end).getTime() - 2 * 60 * 60 * 1000).toISOString()
            : undefined
        }));
        setEvents(shifted);
      })
      .catch(console.error);
  }, [token]);

  const isDateBeforeToday = (dateStr) => {
    if (!dateStr) return false;
    const selected = new Date(dateStr);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return selected < today;
  };

  const isHourInPast = (dateStr, hour) => {
    if (!dateStr) return false;
    const selected = new Date(dateStr); selected.setHours(hour, 0, 0, 0);
    return selected < new Date();
  };

  const findEventAtHour = (hour) => {
    if (!selectedDay) return null;
    const prefix = `${selectedDay}T${formatHour(hour)}`;
    return events.find(e => e.date.startsWith(prefix));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (!formData.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone)) errs.phone = 'Phone must be 10 digits';
    if (!['Point', 'Rappel'].includes(formData.type)) errs.type = 'Invalid type';
    if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(formData.status)) errs.status = 'Invalid status';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const canModifyStatus = (targetStatus) => {
    if (!selectedDay || editingHour === null) return false;
    const eventDate = new Date(selectedDay); eventDate.setHours(editingHour, 0, 0, 0);
    if (targetStatus === 'COMPLETED') return (new Date() - eventDate) >= 60*60*1000;
    return true;
  };

  const handleAddOrUpdate = async () => {
    const existingEvent = findEventAtHour(editingHour);
    if (!existingEvent && (isDateBeforeToday(selectedDay) || isHourInPast(selectedDay, editingHour))) {
      alert("You can't add new events in the past."); return;
    }
    if (!validate()) return;

    const hourStr = formatHour(editingHour);
    const dateTime = `${selectedDay}T${hourStr}:00`;
    const eventPayload = { title: `${formData.type} - ${formData.name}`, date: dateTime, ...formData };

    try {
      if (existingEvent) {
        if (window.confirm("Modify this event?")) {
          const res = await fetch(`${API_BASE}/events/${existingEvent._id}`, { method:'PUT', headers: authHeaders, body: JSON.stringify(eventPayload) });
          const updated = await res.json();
          setEvents(events.map(e => e._id===updated._id?updated:e));
        }
      } else {
        const res = await fetch(`${API_BASE}/events`, { method:'POST', headers: authHeaders, body: JSON.stringify(eventPayload) });
        if (!res.ok) throw new Error("Event creation failed");
        const created = await res.json();
        setEvents([...events, created]);
        window.alert("Event created successfully!");
      }
      setOpenEventForm(false); setEditingHour(null);
      setFormData({ name:'', phone:'', type:'Point', status:'CONFIRMED' }); setErrors({});
    } catch (err) { console.error(err); alert(err.message); }
  };

  const handleDelete = async (hourToDelete) => {
    if (!window.confirm("Delete this event?")) return;
    const existingEvent = findEventAtHour(hourToDelete); if (!existingEvent) return;
    if (isDateBeforeToday(selectedDay) || isHourInPast(selectedDay, hourToDelete)) { alert("Can't delete past events."); return; }

    try {
      await fetch(`${API_BASE}/events/${existingEvent._id}`, { method:'DELETE', headers: authHeaders });
      setEvents(events.filter(e => e._id !== existingEvent._id));
      if (editingHour === hourToDelete) { setOpenEventForm(false); setEditingHour(null); setFormData({ name:'', phone:'', type:'Point', status:'CONFIRMED' }); setErrors({}); }
    } catch (err) { console.error(err); }
  };

  const startEditing = (hour) => {
    const ev = findEventAtHour(hour);
    if (ev) { setFormData({ name: ev.name, phone: ev.phone, type: ev.type, status: ev.status||'CONFIRMED' }); setOriginalStatus(ev.status||'CONFIRMED'); }
    else { setFormData({ name:'', phone:'', type:'Point', status:'CONFIRMED' }); setOriginalStatus('CONFIRMED'); }
    setEditingHour(hour); setErrors({}); setOpenEventForm(true);
  };

  const handleDateClick = (arg) => {
    const clickedDate = arg.dateStr;
    const hasEvent = events.some(e=>e.date.startsWith(clickedDate));
    if (isDateBeforeToday(clickedDate) && !hasEvent) { alert('No events on this past date.'); return; }
    setSelectedDay(clickedDate); setOpenDayModal(true); setEditingHour(null);
    setFormData({ name:'', phone:'', type:'Point', status:'CONFIRMED' }); setErrors({});
  };

  return (
    <>
      <NavBar username={profile?.username} onLogout={()=>{localStorage.removeItem('token'); navigate('/');}}/>
      <Container maxWidth="lg" sx={{ mt:4 }}>
        <Box boxShadow={3} p={2} bgcolor="white" borderRadius={2}>
          {/* FullCalendar now uses shifted events */}
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            selectable
            events={events}
            dateClick={handleDateClick}
          />
        </Box>
      </Container>

      {/* --- Day Modal and Event Form remain unchanged --- */}
      {/* ... keep the rest of your Dialogs and handlers exactly as you had them ... */}
    </>
  );
}
