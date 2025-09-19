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
      .then(setEvents)
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
          <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" selectable events={events.map(e => ({
  ...e,
  start: e.date.split('T')[0], // "2025-09-19"
  allDay: true
}))} dateClick={handleDateClick}/ >
        </Box>
      </Container>

      <Dialog open={openDayModal} onClose={()=>setOpenDayModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Schedule for {selectedDay}</DialogTitle>
        <DialogContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Hour</TableCell><TableCell>Event Name</TableCell><TableCell>Customer Name</TableCell><TableCell>Phone</TableCell><TableCell>Status</TableCell><TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {HOURS.map(hour=>{
                const ev=findEventAtHour(hour); const isPast=isDateBeforeToday(selectedDay)||isHourInPast(selectedDay,hour);
                return <TableRow key={hour}>
                  <TableCell>{formatHour(hour)}</TableCell>
                  <TableCell>{ev?.title||''}</TableCell>
                  <TableCell>{ev?.name||''}</TableCell>
                  <TableCell>{ev?.phone||''}</TableCell>
                  <TableCell>{ev?.status||''}</TableCell>
                  <TableCell>
                    {ev ? <>
                      <IconButton color="primary" size="small" onClick={()=>startEditing(hour)} title="Modify"><EditIcon/></IconButton>
                      <IconButton color="error" size="small" onClick={()=>handleDelete(hour)} title="Delete"><DeleteIcon/></IconButton>
                    </> : <IconButton color="primary" size="small" onClick={()=>startEditing(hour)} title="Add" disabled={isPast}><AddIcon/></IconButton>}
                  </TableCell>
                </TableRow>
              })}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenDayModal(false)} variant="contained" color="primary">Close</Button>
          <Button variant="contained" color="success" onClick={()=>{
            const filtered=events.filter(e=>dayjs(e.date).startOf('day').isSame(dayjs(selectedDay).startOf('day')));
            if(filtered.length===0){alert('No events found for this day.');return;}
            const csv=Papa.unparse(filtered.map(e=>({title:e.title,date:dayjs(e.date).format('M/D/YYYY'),time:dayjs(e.date).format('HH:mm'),name:e.name,phone:e.phone,type:e.type,status:e.status})));
            saveAs(new Blob([csv],{type:'text/csv;charset=utf-8;'}),`events_${dayjs(selectedDay).format('YYYY-MM-DD')}.csv`);
          }}>Export CSV</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEventForm} onClose={()=>setOpenEventForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingHour!==null && findEventAtHour(editingHour)?'Modify Event':'Add Event'}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>For hour: {formatHour(editingHour)}</Typography>
          <TextField margin="dense" label="Customer Name" fullWidth value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} error={!!errors.name} helperText={errors.name}/>
          <TextField margin="dense" label="Customer Phone" fullWidth value={formData.phone} onChange={e=>setFormData({...formData,phone:e.target.value})} error={!!errors.phone} helperText={errors.phone}/>
          <TextField margin="dense" select label="Type" fullWidth value={formData.type} onChange={e=>setFormData({...formData,type:e.target.value})}>
            <MenuItem value="Point">Point</MenuItem><MenuItem value="Rappel">Rappel</MenuItem>
          </TextField>

          {findEventAtHour(editingHour) && (
            <TextField margin="dense" select label="Status" fullWidth value={formData.status} onChange={e=>{
              const newStatus=e.target.value;
              if(!canModifyStatus(newStatus)){alert("COMPLETED only after +1h."); return;}
              setFormData({...formData,status:newStatus});
            }} error={!!errors.status} helperText={errors.status} disabled={['COMPLETED','CANCELLED'].includes(originalStatus)}>
              <MenuItem value="CONFIRMED">CONFIRMED</MenuItem>
              <MenuItem value="CANCELLED">CANCELLED</MenuItem>
              <MenuItem value="COMPLETED">COMPLETED</MenuItem>
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenEventForm(false)} variant="contained" color="primary">Cancel</Button>
          <Button onClick={handleAddOrUpdate} variant="contained" color="success">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
