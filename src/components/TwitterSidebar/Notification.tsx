import React from "react"

interface NotificationProps {
  error: string | null
  notification: string | null
  setError: (error: string | null) => void
}

/**
 * Notification Component
 * Displays errors and success notifications
 */
const Notification: React.FC<NotificationProps> = ({
  error,
  notification,
  setError
}) => {
  if (!error && !notification) {
    return null
  }

  return (
    <>
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {notification && (
        <div className="notification">
          <p>{notification}</p>
        </div>
      )}
    </>
  )
}

export default Notification
