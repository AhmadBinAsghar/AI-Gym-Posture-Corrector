#include "PoseLandmarkerOnLoad.hpp"
#include "JHybridPoseLandmarkerSpec.hpp"
#include "JHybridSpeakerSpec.hpp"
#include <fbjni/fbjni.h>
#include <jni.h>
#include <NitroModules/HybridObjectRegistry.hpp>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::poselandmarker::registerAllNatives();
  });
}

namespace margelo::nitro::poselandmarker {

struct JHybridPoseLandmarkerSpecImpl:
  public facebook::jni::JavaClass<JHybridPoseLandmarkerSpecImpl, JHybridPoseLandmarkerSpec::JavaPart> {
  static constexpr auto kJavaDescriptor = "Lcom/margelo/nitro/poselandmarker/HybridPoseLandmarker;";

  static std::shared_ptr<JHybridPoseLandmarkerSpec> create() {
    static const auto constructorFn = javaClassStatic()->getConstructor<JHybridPoseLandmarkerSpecImpl::javaobject()>();
    facebook::jni::local_ref<JHybridPoseLandmarkerSpec::JavaPart> javaPart = javaClassStatic()->newObject(constructorFn);
    return javaPart->getJHybridPoseLandmarkerSpec();
  }
};

struct JHybridSpeakerSpecImpl:
  public facebook::jni::JavaClass<JHybridSpeakerSpecImpl, JHybridSpeakerSpec::JavaPart> {
  static constexpr auto kJavaDescriptor = "Lcom/margelo/nitro/poselandmarker/HybridSpeaker;";

  static std::shared_ptr<JHybridSpeakerSpec> create() {
    static const auto constructorFn = javaClassStatic()->getConstructor<JHybridSpeakerSpecImpl::javaobject()>();
    facebook::jni::local_ref<JHybridSpeakerSpec::JavaPart> javaPart = javaClassStatic()->newObject(constructorFn);
    return javaPart->getJHybridSpeakerSpec();
  }
};

void registerAllNatives() {
  JHybridPoseLandmarkerSpec::CxxPart::registerNatives();
  JHybridSpeakerSpec::CxxPart::registerNatives();

  margelo::nitro::HybridObjectRegistry::registerHybridObjectConstructor(
    "PoseLandmarker",
    []() -> std::shared_ptr<margelo::nitro::HybridObject> {
      return JHybridPoseLandmarkerSpecImpl::create();
    }
  );
  margelo::nitro::HybridObjectRegistry::registerHybridObjectConstructor(
    "Speaker",
    []() -> std::shared_ptr<margelo::nitro::HybridObject> {
      return JHybridSpeakerSpecImpl::create();
    }
  );
}

} // namespace margelo::nitro::poselandmarker
