import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

const events = [
  {
    title: "Calculus with Gideon",
    start: "2023-11-03T14:00:00",
    className: "event-math",
  },
  {
    title: "Programming with Sarah",
    start: "2023-11-08T15:30:00",
    className: "event-cs",
  },
  {
    title: "Finance with David",
    start: "2023-11-14T11:00:00",
    className: "event-business",
  },
  {
    title: "Algebra with Gideon",
    start: "2023-11-22T16:00:00",
    className: "event-math",
  },
  {
    title: "Web Dev with Sarah",
    start: "2023-11-30T13:00:00",
    className: "event-cs",
  },
];

const Dashboard = () => {
  return (
    <div className="content-view active" id="dashboard-view">
      <h2 className="section-title">
        <i className="fas fa-calendar"></i>My Schedule
      </h2>
      <div className="calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;
