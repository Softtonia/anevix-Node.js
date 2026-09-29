const HsnCode = require("../../models/tax/HsnCode");

exports.searchHsn = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Use MongoDB text search for the search string
    const results = await HsnCode.find({ $text: { $search: query } })
      .limit(20)
      .lean();

    // If no text results but query looks like a code, try finding by prefix
    if (results.length === 0 && !isNaN(query)) {
      const prefixResults = await HsnCode.find({
        hsnCode: { $regex: `^${query}` }
      })
      .limit(20)
      .lean();
      
      return res.json(prefixResults);
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Error searching HSN codes", error: error.message });
  }
};
