#include <stdio.h>
int main() { printf("%.30f\n", 0.1); printf("%.25e\n", 1.0 / 3); printf("%.17g %.17g\n", 0.1 + 0.2, 1e22); printf("%f\n", 1e30); printf("%.3f\n", 123456789012345678.0); printf("%f %e\n", 5e-324, 5e-324); printf("%g %f\n", 1.7976931348623157e308, 1e-310); return 0; }
