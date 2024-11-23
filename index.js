const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;


app.use(bodyParser.json());


const mongoURI = 'mongodb://127.0.0.1:27017/doctor_appointments'; 
mongoose
    .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.error('MongoDB connection error:', err));

const appointmentSchema = new mongoose.Schema({
    patient: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
    },
    timeSlot: { type: String, required: true },
    doctorName: { type: String, required: true },
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

const doctors = ["Dr. Smith", "Dr. Johnson", "Dr. Williams"];


app.post('/appointments', async (req, res) => {
    const { firstName, lastName, email, timeSlot, doctorName } = req.body;

    if (!firstName || !lastName || !email || !timeSlot || !doctorName) {
        return res.status(400).json({ error: "All fields are required." });
    }

    if (!doctors.includes(doctorName)) {
        return res.status(400).json({ error: "Invalid doctor name." });
    }

    try {
        const existingAppointment = await Appointment.findOne({
            timeSlot,
            doctorName,
        });

        if (existingAppointment) {
            return res
                .status(400)
                .json({ error: "Time slot is already booked for this doctor." });
        }

        const newAppointment = new Appointment({
            patient: { firstName, lastName, email },
            timeSlot,
            doctorName,
        });

        await newAppointment.save();

        return res.status(201).json({
            message: "Appointment booked successfully.",
            appointment: newAppointment,
        });
    } catch (err) {
        return res.status(500).json({ error: "Internal server error." });
    }
});

app.get('/appointments/:email', async (req, res) => {
    const { email } = req.params;

    try {
        const userAppointments = await Appointment.find({ "patient.email": email });

        if (userAppointments.length === 0) {
            return res.status(404).json({ error: "No appointments found." });
        }

        return res.status(200).json({ appointments: userAppointments });
    } catch (err) {
        return res.status(500).json({ error: "Internal server error." });
    }
});

app.get('/appointments/doctor/:doctorName', async (req, res) => {
    const { doctorName } = req.params;

    if (!doctors.includes(doctorName)) {
        return res.status(400).json({ error: "Invalid doctor name." });
    }

    try {
        const doctorAppointments = await Appointment.find({ doctorName });

        return res.status(200).json({ appointments: doctorAppointments });
    } catch (err) {
        return res.status(500).json({ error: "Internal server error." });
    }
});

app.delete('/appointments', async (req, res) => {
    const { email, timeSlot } = req.body;

    try {
        const deletedAppointment = await Appointment.findOneAndDelete({
            "patient.email": email,
            timeSlot,
        });

        if (!deletedAppointment) {
            return res.status(404).json({ error: "Appointment not found." });
        }

        return res
            .status(200)
            .json({ message: "Appointment cancelled successfully." });
    } catch (err) {
        return res.status(500).json({ error: "Internal server error." });
    }
});

app.put('/appointments', async (req, res) => {
    const { email, originalTimeSlot, newTimeSlot } = req.body;

    try {
        const appointment = await Appointment.findOne({
            "patient.email": email,
            timeSlot: originalTimeSlot,
        });

        if (!appointment) {
            return res.status(404).json({ error: "Original appointment not found." });
        }

        const conflictingAppointment = await Appointment.findOne({
            timeSlot: newTimeSlot,
            doctorName: appointment.doctorName,
        });

        if (conflictingAppointment) {
            return res.status(400).json({
                error: "New time slot is already booked for this doctor.",
            });
        }

        appointment.timeSlot = newTimeSlot;
        await appointment.save();

        return res.status(200).json({
            message: "Appointment updated successfully.",
            appointment,
        });
    } catch (err) {
        return res.status(500).json({ error: "Internal server error." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
