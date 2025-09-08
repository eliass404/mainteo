-- Allow admins to manage chat messages (needed so admin can delete dependent rows before machine deletion)
CREATE POLICY "Admins can manage all chat messages"
ON public.chat_messages
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow admins to delete any intervention report (cleanup before machine deletion)
CREATE POLICY "Admins can delete any intervention report"
ON public.intervention_reports
FOR DELETE
USING (is_admin());