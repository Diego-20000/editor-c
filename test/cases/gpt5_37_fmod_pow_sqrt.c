#include <stdio.h>
#include <math.h>
int main() {
    printf("%.1f %.2f %.1f %.17f\n",
           fmod(7.0, 2.0), pow(2.0, -2.0),
           pow(9.0, 0.5), sqrt(2.0));
}
