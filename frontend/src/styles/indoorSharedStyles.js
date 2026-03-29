export const indoorPoiMarkerStyle = {
  position: "absolute",
  width: 22,
  height: 22,
  marginLeft: -11,
  marginTop: -11,
  borderRadius: 11,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff",
  borderWidth: 1.25,
  borderColor: "rgba(145, 35, 56, 0.22)",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 1.5,
  elevation: 1,
  zIndex: 2,
};

export const indoorPoiLegendStyles = {
  poiLegendScroll: {
    marginTop: 2,
    marginBottom: 4,
    alignSelf: "center",
  },
  poiLegend: {
    flexDirection: "row",
    paddingVertical: 2,
    paddingHorizontal: 2,
    gap: 8,
    alignItems: "center",
  },
  poiLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#e3d8dd",
    borderRadius: 8,
    backgroundColor: "#f7f2f4",
  },
  poiLabel: {
    fontSize: 12,
    color: "#666",
  },
};
