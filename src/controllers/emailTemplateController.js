const EmailTemplate = require("../models/EmailTemplate");

// Predefined placeholders that admin can use
const PLACEHOLDERS = [
  {
    variable: "UserName",
    tag: "{{UserName}}",
    label: "User Full Name",
    description: "The full name of the user receiving the email.",
    example: "Demo User"
  },
  {
    variable: "Username",
    tag: "{{Username}}",
    label: "Username",
    description: "The unique username / login ID assigned to the user.",
    example: "demo.user"
  },
  {
    variable: "TemporaryPassword",
    tag: "{{TemporaryPassword}}",
    label: "Temporary Password",
    description: "The system-generated temporary password for initial login.",
    example: "TempExample123!"
  },
  {
    variable: "CompanyName",
    tag: "{{CompanyName}}",
    label: "Company / Application Name",
    description: "The configured organization or application brand name.",
    example: "Vyapari Darbaar"
  },
  {
    variable: "SupportEmail",
    tag: "{{SupportEmail}}",
    label: "Support Email",
    description: "The official support contact email address.",
    example: "support@vyaparidarbar.com"
  },
  {
    variable: "ResetLink",
    tag: "{{ResetLink}}",
    label: "Password Reset Link",
    description: "The URL link to reset a forgotten password.",
    example: "https://example.com/reset-password?token=123"
  }
];

// Get available placeholders
exports.getPlaceholders = (req, res) => {
  try {
    res.status(200).json({
      status: true,
      message: "Supported email template placeholders retrieved successfully.",
      data: PLACEHOLDERS
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error", error: error.message });
  }
};

// Helper to extract unique placeholder keys from subject and body
const extractPlaceholders = (subject, body) => {
  const content = `${subject || ""} ${body || ""}`;
  const regex = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const matches = new Set();
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.add(match[1].trim());
  }
  
  return Array.from(matches);
};

// Create a new email template
exports.createTemplate = async (req, res) => {
  try {
    const { name, key, subject, body, isActive } = req.body;

    const existingTemplate = await EmailTemplate.findOne({ key: key.toUpperCase() });
    if (existingTemplate) {
      return res.status(400).json({ message: `Template with key ${key} already exists.` });
    }

    const detectedPlaceholders = extractPlaceholders(subject, body);

    const template = new EmailTemplate({
      name,
      key: key.toUpperCase(),
      subject,
      body,
      placeholders: detectedPlaceholders,
      isActive,
    });

    await template.save();
    res.status(201).json({ message: "Template created successfully", template });
  } catch (error) {
    res.status(500).json({ message: "Failed to create template", error: error.message });
  }
};

// Get all templates with pagination
exports.getTemplates = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.per_page) || 20;
    const skip = (page - 1) * limit;

    const templates = await EmailTemplate.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await EmailTemplate.countDocuments();

    res.status(200).json({
      templates,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalTemplates: total,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch templates", error: error.message });
  }
};

// Get a single template by ID
exports.getTemplateById = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch template", error: error.message });
  }
};

// Get a single template by Key
exports.getTemplateByKey = async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({ key: req.params.key.toUpperCase() });
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch template", error: error.message });
  }
};

// Update a template by ID
exports.updateTemplateById = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.key) {
      updates.key = updates.key.toUpperCase();
    }

    if (updates.subject !== undefined || updates.body !== undefined) {
      const currentTemplate = await EmailTemplate.findById(req.params.id);
      if (!currentTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      const finalSubject = updates.subject !== undefined ? updates.subject : currentTemplate.subject;
      const finalBody = updates.body !== undefined ? updates.body : currentTemplate.body;
      
      updates.placeholders = extractPlaceholders(finalSubject, finalBody);
    }

    const template = await EmailTemplate.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.status(200).json({ message: "Template updated successfully", template });
  } catch (error) {
    res.status(500).json({ message: "Failed to update template", error: error.message });
  }
};

// Delete a template by ID
exports.deleteTemplateById = async (req, res) => {
  try {
    const template = await EmailTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.status(200).json({ message: "Template deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete template", error: error.message });
  }
};

// Preview a template (replaces placeholders with dummy text)
exports.previewTemplate = (req, res) => {
  try {
    const { body, dummyData = {} } = req.body;

    if (!body) {
      return res.status(400).json({ message: "HTML body is required for preview" });
    }

    let previewHtml = body;

    // Map dynamic placeholders to their examples
    const defaultData = {};
    
    PLACEHOLDERS.forEach(placeholder => {
      // Using the variable name since the regex wraps it in {{ }} below
      defaultData[placeholder.variable] = placeholder.example;
    });

    // Also include old formats for backward compatibility for existing templates
    const fallbackData = {
      user_name: "John Doe",
      admin_name: "Admin User",
      reset_link: "https://example.com/reset-password?token=123",
      company_name: "Anevix Ecommerce",
      login_link: "https://example.com/login",
    };

    const previewData = { ...fallbackData, ...defaultData, ...dummyData };

    // Replace placeholders e.g., {{UserName}} -> Demo User
    for (const [key, value] of Object.entries(previewData)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
      previewHtml = previewHtml.replace(regex, value);
    }

    res.status(200).json({ previewHtml });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate preview", error: error.message });
  }
};
