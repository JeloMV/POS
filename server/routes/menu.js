const express = require('express');
const router = express.Router();
const db = require('../db');

// Get entire menu structure (sections, products, and available addons)
router.get('/', async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';

    let sectionSql = 'SELECT * FROM menu_section';
    if (!includeArchived) {
      sectionSql += ' WHERE is_archived = FALSE';
    }
    sectionSql += ' ORDER BY section_id ASC';

    const [sections] = await db.query(sectionSql);

    let productSql = 'SELECT * FROM menu_products';
    if (!includeArchived) {
      productSql += ' WHERE is_archived = FALSE';
    }
    productSql += ' ORDER BY product_id ASC';

    const [products] = await db.query(productSql);

    const [addons] = await db.query('SELECT * FROM product_addons ORDER BY addon_id ASC');

    // Group products by section
    const menu = sections.map(sec => ({
      ...sec,
      is_available: Boolean(sec.is_available),
      is_archived: Boolean(sec.is_archived),
      products: products
        .filter(p => p.section_id === sec.section_id)
        .map(p => ({
          ...p,
          is_available: Boolean(p.is_available),
          is_archived: Boolean(p.is_archived),
          allow_quantity: Boolean(p.allow_quantity),
          price: parseFloat(p.price)
        }))
    }));

    res.json({
      success: true,
      sections: menu,
      addons: addons.map(a => ({
        ...a,
        is_available: Boolean(a.is_available),
        addon_price: parseFloat(a.addon_price)
      }))
    });
  } catch (error) {
    console.error('Menu fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new menu section
router.post('/section', async (req, res) => {
  try {
    const { section_name } = req.body;
    if (!section_name || !section_name.trim()) {
      return res.status(400).json({ success: false, error: 'Section name is required' });
    }
    const [result] = await db.query(
      'INSERT INTO menu_section (section_name, is_available, is_archived) VALUES (?, TRUE, FALSE)',
      [section_name.trim()]
    );
    res.json({ success: true, section_id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rename menu section
router.put('/section/:id', async (req, res) => {
  try {
    const { section_name } = req.body;
    const { id } = req.params;
    if (!section_name || !section_name.trim()) {
      return res.status(400).json({ success: false, error: 'Section name is required' });
    }
    await db.query(
      'UPDATE menu_section SET section_name = ? WHERE section_id = ?',
      [section_name.trim(), id]
    );
    res.json({ success: true, message: 'Section renamed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Soft-archive / unarchive a section
router.put('/section/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const [current] = await db.query('SELECT is_archived FROM menu_section WHERE section_id = ?', [id]);
    if (!current.length) {
      return res.status(404).json({ success: false, error: 'Section not found' });
    }
    const newArchivedStatus = !current[0].is_archived;
    await db.query('UPDATE menu_section SET is_archived = ? WHERE section_id = ?', [newArchivedStatus, id]);
    res.json({
      success: true,
      is_archived: newArchivedStatus,
      message: newArchivedStatus ? 'Section archived' : 'Section restored'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add new product under a section
router.post('/product', async (req, res) => {
  try {
    const { section_id, product_name, description, price, allow_quantity, image_url } = req.body;
    if (!section_id || !product_name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Section, product name, and price are required' });
    }
    const [result] = await db.query(
      `INSERT INTO menu_products (section_id, product_name, description, price, is_available, image_url, allow_quantity, is_archived)
       VALUES (?, ?, ?, ?, TRUE, ?, ?, FALSE)`,
      [
        section_id,
        product_name.trim(),
        description || '',
        parseFloat(price) || 0,
        image_url || 'assets/logo.png',
        allow_quantity !== false
      ]
    );
    res.json({ success: true, product_id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update product details
router.put('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, description, price, allow_quantity, image_url, section_id } = req.body;

    let updates = [];
    let params = [];

    if (product_name !== undefined) { updates.push('product_name = ?'); params.push(product_name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (price !== undefined) { updates.push('price = ?'); params.push(parseFloat(price) || 0); }
    if (allow_quantity !== undefined) { updates.push('allow_quantity = ?'); params.push(Boolean(allow_quantity)); }
    if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url); }
    if (section_id !== undefined) { updates.push('section_id = ?'); params.push(section_id); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(id);
    await db.query(`UPDATE menu_products SET ${updates.join(', ')} WHERE product_id = ?`, params);
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle product availability
router.put('/product/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const [current] = await db.query('SELECT is_available FROM menu_products WHERE product_id = ?', [id]);
    if (!current.length) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const newStatus = !current[0].is_available;
    await db.query('UPDATE menu_products SET is_available = ? WHERE product_id = ?', [newStatus, id]);
    res.json({
      success: true,
      is_available: newStatus,
      message: newStatus ? 'Product marked available' : 'Product marked unavailable'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Soft-archive / unarchive a product
router.put('/product/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const [current] = await db.query('SELECT is_archived FROM menu_products WHERE product_id = ?', [id]);
    if (!current.length) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const newArchivedStatus = !current[0].is_archived;
    await db.query('UPDATE menu_products SET is_archived = ? WHERE product_id = ?', [newArchivedStatus, id]);
    res.json({
      success: true,
      is_archived: newArchivedStatus,
      message: newArchivedStatus ? 'Product archived' : 'Product restored'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List addons
router.get('/addons', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM product_addons ORDER BY addon_category, addon_id ASC');
    res.json({ success: true, addons: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
