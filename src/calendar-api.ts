export async function createCalendarEvent(
  accessToken: string,
  rental: {
    toolName: string;
    clientName: string;
    clientPhone: string;
    startDate: string;
    endDate: string;
  }
): Promise<string | null> {
  // Google Calendar all-day event end date is exclusive. To make it wrap correctly, 
  // we add 1 day to the end date for proper calendar visual block representation.
  let exclusiveEndStr = rental.endDate;
  try {
    const endDateObj = new Date(rental.endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    exclusiveEndStr = endDateObj.toISOString().split('T')[0];
  } catch (e) {
    console.error('Date parsing issue for exclusivity', e);
  }

  const event = {
    summary: `Аренда: ${rental.toolName} — ${rental.clientName}`,
    description: `Инструмент: ${rental.toolName}\nКлиент: ${rental.clientName}\nТелефон: ${rental.clientPhone}\nДата старта: ${rental.startDate}\nДата завершения: ${rental.endDate}`,
    start: {
      date: rental.startDate,
    },
    end: {
      date: exclusiveEndStr,
    },
    reminders: {
      useDefault: true
    }
  };

  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to add to Google Calendar: ${errText}`);
    }

    const data = await response.json();
    return data.id as string;
  } catch (err) {
    console.error('Google Calendar Sync Error:', err);
    throw err;
  }
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.ok;
  } catch (err) {
    console.error('Google Calendar Delete Error:', err);
    return false;
  }
}
