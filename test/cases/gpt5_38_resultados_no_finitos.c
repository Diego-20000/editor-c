#include <stdio.h>
#include <math.h>
int main() {
    printf("%f %f\n", log(0.0), sqrt(-1.0));
    printf("%.6f %.1f\n", atan2(1.0, 0.0), hypot(3.0, 4.0));
}
