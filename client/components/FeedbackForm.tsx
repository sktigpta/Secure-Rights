"use client"
import { useState } from "react"
import "./styles.css"

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    feedback: "",
  })

  const [message, setMessage] = useState("")

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Simple validation
    if (!formData.name || !formData.email || !formData.feedback) {
      setMessage("Please fill out all fields.")
      return
    }

    // Assuming you have an API to handle the form submission
    console.log("Feedback submitted:", formData)
    
    // Show success message
    setMessage("Thank you for your feedback!")

    // Optionally reset form
    setFormData({
      name: "",
      email: "",
      feedback: "",
    })
  }

  return (
    <div className="feedback-form">
      <h2>Feedback Form</h2>

      {message && <p className="feedback-message">{message}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="feedback">Feedback</label>
          <textarea
            id="feedback"
            name="feedback"
            value={formData.feedback}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">Submit Feedback</button>
      </form>
    </div>
  )
}

export default FeedbackForm
