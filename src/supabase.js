import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rjsfhdoamcwybrbyiyij.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqc2ZoZG9hbWN3eWJyYnlpeWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTM3MjQsImV4cCI6MjA5MTI4OTcyNH0.10csTbTmdZVmadQ0ZnpGDm9uhyLYLDH2HTNnSmBDGJs'

export const supabase = createClient(supabaseUrl, supabaseKey)
