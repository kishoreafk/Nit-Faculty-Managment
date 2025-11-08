class AutoFillController {
  async getAvailableForms(req, res) {
    res.json({ success: true, message: 'Service temporarily disabled' });
  }
  
  async getFormStructure(req, res) {
    res.json({ success: true, message: 'Service temporarily disabled' });
  }
  
  async previewForm(req, res) {
    res.json({ success: true, message: 'Service temporarily disabled' });
  }
  
  async submitForm(req, res) {
    res.json({ success: true, message: 'Service temporarily disabled' });
  }
  
  async downloadForm(req, res) {
    res.json({ success: true, message: 'Service temporarily disabled' });
  }
  
  async validateForm(req, res) {
    res.json({ success: true, message: 'Service temporarily disabled' });
  }
  
  async calculateLeaveDays(req, res) {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start date and end date required' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    res.json({ success: true, data: { numberOfDays: days } });
  }
  
  async getFacultyProfile(req, res) {
    res.json({ success: true, message: 'Service temporarily disabled' });
  }
  
  async getFieldOptions(req, res) {
    res.json({ success: true, message: 'Service temporarily disabled' });
  }
}

module.exports = new AutoFillController();