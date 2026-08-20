window.dosteaSendNotification = async function (event, recordId) {
    if (!window.supabaseClient || !recordId) return false;

    try {
        const { error } = await window.supabaseClient.functions.invoke(
            "send-dostea-email",
            { body: { event, record_id: recordId } }
        );

        if (error) throw error;
        return true;
    } catch (error) {
        console.warn("DOSTEA email notification:", error.message || error);
        return false;
    }
};
