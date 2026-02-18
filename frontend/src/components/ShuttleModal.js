import React from "react";
import { View, Text, Modal, Pressable, Image } from "react-native";

export default function ShuttleModal({
  styles,
  isOpen,
  onClose,
  filteredShuttleSchedules,
  getShuttleDepartures,
}) {
  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Concordia Shuttle</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>X</Text>
            </Pressable>
          </View>

          {filteredShuttleSchedules.map((schedule) => {
            const { active, times } = getShuttleDepartures(new Date(), schedule);
            return (
              <View key={schedule.id} style={styles.modalSection}>
                <Text style={styles.modalSubtitle}>
                  {schedule.campus} - {schedule.stop}
                </Text>
                <Text style={styles.modalAddress}>{schedule.address}</Text>

                <View style={styles.modalSchedule}>
                  <Text style={styles.modalScheduleTitle}>Schedule</Text>
                  <Text style={styles.modalScheduleText}>
                    Monday to Thursday: every {schedule.weekday.intervalMin} minutes
                    {" "}({schedule.weekday.start}–{schedule.weekday.end})
                  </Text>
                  <Text style={styles.modalScheduleText}>
                    Friday: every {schedule.friday.intervalMin} minutes (
                    {schedule.friday.start}–{schedule.friday.end})
                  </Text>
                </View>

                <View style={styles.modalDepartures}>
                  <Text style={styles.modalScheduleTitle}>Next departures</Text>
                  {!active || times.length === 0 ? (
                    <Text style={styles.modalEmpty}>No more departures today.</Text>
                  ) : (
                    times.map((t) => (
                      <View key={`${schedule.id}-${t}`} style={styles.departureRow}>
                        <Image
                          source={require("../../assets/Clogo.png")}
                          style={styles.departureIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.departureTime}>{t}</Text>
                        <Text style={styles.departureEta}>
                          ETA{" "}
                          {(() => {
                            const [h, m] = t.split(":").map((v) => parseInt(v, 10));
                            const mins = h * 60 + m + (schedule.estimatedTravelMin || 0);
                            const eh = Math.floor(mins / 60) % 24;
                            const em = mins % 60;
                            return `${eh.toString().padStart(2, "0")}:${em
                              .toString()
                              .padStart(2, "0")}`;
                          })()}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
