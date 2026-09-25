require("dotenv").config();
const mongoose = require("mongoose");
const EmailTemplate = require("../models/EmailTemplate");
const connectDB = require("../config/db");

const seedEmailTemplates = async () => {
  try {
    await connectDB();

    const templates = [
      {
        name: "User Registration / Welcome User",
        key: "USER_REGISTRATION",
        subject: "Welcome to {{company_name}}, {{first_name}}!",
        body: `<p>Hi {{first_name}},</p>
<p>Welcome to {{company_name}}! We are thrilled to have you on board.</p>
<p>If you have any questions, feel free to contact us at {{support_email}}.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["company_name", "first_name", "support_email"],
        isActive: true,
      },
      {
        name: "Forgot Password",
        key: "PASSWORD_RESET",
        subject: "Reset your password for {{company_name}}",
        body: `<p>Hi {{first_name}},</p>
<p>We received a request to reset your password. Click the link below to set a new one:</p>
<p><a href="{{reset_link}}">Reset Password</a></p>
<p>If you did not request this, please ignore this email.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "company_name", "reset_link"],
        isActive: true,
      },
      {
        name: "User Added (Admin)",
        key: "USER_ADDED",
        subject: "An account has been created for you at {{company_name}}",
        body: `<p>Hi {{first_name}},</p>
<p>An administrator has created an account for you at {{company_name}}.</p>
<p>You can log in using your email address and reset your password if needed.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "company_name"],
        isActive: true,
      },
      {
        name: "User Profile Updated",
        key: "USER_UPDATED",
        subject: "Your profile at {{company_name}} has been updated",
        body: `<p>Hi {{first_name}},</p>
<p>This is a confirmation that your account details were successfully updated.</p>
<p>If you did not make these changes, please contact us immediately.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "company_name"],
        isActive: true,
      },
      {
        name: "Password Changed Successfully",
        key: "PASSWORD_CHANGED",
        subject: "Your password has been changed",
        body: `<p>Hi {{first_name}},</p>
<p>Your password for {{company_name}} was successfully changed.</p>
<p>If you did not perform this action, please contact support immediately.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "company_name"],
        isActive: true,
      },
      {
        name: "Order Confirmation",
        key: "ORDER_PURCHASED",
        subject: "Your Order #{{order_id}} has been confirmed!",
        body: `<p>Hi {{first_name}},</p>
<p>Thank you for your purchase! Your order #{{order_id}} is confirmed.</p>
<p>We will notify you once it ships.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "order_id", "company_name"],
        isActive: true,
      },
      {
        name: "Order Failed",
        key: "ORDER_FAILED",
        subject: "Update on your Order #{{order_id}}",
        body: `<p>Hi {{first_name}},</p>
<p>Unfortunately, your order #{{order_id}} could not be processed successfully.</p>
<p>Please log in to your account to review the issue or contact our support team.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "order_id", "company_name"],
        isActive: true,
      },
      {
        name: "Order Shipped",
        key: "ORDER_SHIPPED",
        subject: "Your Order #{{order_id}} has been shipped!",
        body: `<p>Hi {{first_name}},</p>
<p>Good news! Your order #{{order_id}} has been shipped.</p>
<p>Tracking Number: {{tracking_number}}</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "order_id", "tracking_number", "company_name"],
        isActive: true,
      },
      {
        name: "Order Delivered",
        key: "ORDER_DELIVERED",
        subject: "Your Order #{{order_id}} has been delivered!",
        body: `<p>Hi {{first_name}},</p>
<p>Your order #{{order_id}} has been marked as delivered.</p>
<p>We hope you enjoy your purchase! Feel free to leave a review.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "order_id", "company_name"],
        isActive: true,
      },
      {
        name: "New Seller Registration",
        key: "SELLER_REGISTERED",
        subject: "Welcome as a new seller on {{company_name}}!",
        body: `<p>Hi {{first_name}},</p>
<p>Thank you for registering as a seller on {{company_name}}.</p>
<p>Please complete your onboarding profile to get started.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "company_name"],
        isActive: true,
      },
      {
        name: "Seller Onboarding Completed",
        key: "SELLER_ONBOARDING_COMPLETED",
        subject: "Onboarding completed successfully",
        body: `<p>Hi {{first_name}},</p>
<p>Your onboarding profile is complete and is currently under review by our team.</p>
<p>We will notify you once your account is approved.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "company_name"],
        isActive: true,
      },
      {
        name: "Seller Account Approved",
        key: "SELLER_APPROVED",
        subject: "Congratulations! Your seller account is approved.",
        body: `<p>Hi {{first_name}},</p>
<p>Great news! Your seller account on {{company_name}} has been approved.</p>
<p>You can now log in and start listing your products.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "company_name"],
        isActive: true,
      },
      {
        name: "Seller Account Rejected",
        key: "SELLER_REJECTED",
        subject: "Update regarding your seller account application",
        body: `<p>Hi {{first_name}},</p>
<p>Thank you for applying to be a seller on {{company_name}}.</p>
<p>Unfortunately, your application was not approved at this time for the following reason:</p>
<p>{{rejection_reason}}</p>
<p>If you have any questions, please contact our support team.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "company_name", "rejection_reason"],
        isActive: true,
      },
      {
        name: "Seller Re-apply Notification",
        key: "SELLER_REAPPLY",
        subject: "You can now re-apply as a seller",
        body: `<p>Hi {{first_name}},</p>
<p>You are now eligible to re-apply for a seller account on {{company_name}}.</p>
<p>Please log in and update your information to submit a new application.</p>
<p>Thanks,<br>The {{company_name}} Team</p>`,
        placeholders: ["first_name", "company_name"],
        isActive: true,
      },
      {
        name: "Ticket Raised",
        key: "TICKET_RAISED",
        subject: "Support Ticket #{{ticket_id}} Opened",
        body: `<p>Hi {{first_name}},</p>
<p>We have received your support request. Your ticket ID is #{{ticket_id}}.</p>
<p>Our team will look into this and get back to you shortly.</p>
<p>Thanks,<br>The {{company_name}} Support Team</p>`,
        placeholders: ["first_name", "ticket_id", "company_name"],
        isActive: true,
      },
      {
        name: "Ticket Resolved",
        key: "TICKET_RESOLVED",
        subject: "Support Ticket #{{ticket_id}} Resolved",
        body: `<p>Hi {{first_name}},</p>
<p>Your support ticket #{{ticket_id}} has been marked as resolved.</p>
<p>If you still need assistance, please feel free to reopen the ticket or create a new one.</p>
<p>Thanks,<br>The {{company_name}} Support Team</p>`,
        placeholders: ["first_name", "ticket_id", "company_name"],
        isActive: true,
      }
    ];

    for (const template of templates) {
      // Find and update if exists, or create if it doesn't
      const existing = await EmailTemplate.findOne({ key: template.key });
      if (!existing) {
        await EmailTemplate.create(template);
        console.log(`Created template: ${template.key}`);
      } else {
        await EmailTemplate.updateOne({ key: template.key }, { $set: template });
        console.log(`Updated template: ${template.key}`);
      }
    }

    console.log("All requested email templates seeding completed successfully!");
    process.exit();
  } catch (error) {
    console.error("Error seeding email templates:", error);
    process.exit(1);
  }
};

seedEmailTemplates();
